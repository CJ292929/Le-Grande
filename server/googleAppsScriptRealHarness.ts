/**
 * Executes the ACTUAL google-apps-script/Code.gs (byte-for-byte, via
 * node:vm) with stubbed Google services (PropertiesService, LockService,
 * SpreadsheetApp, Utilities, ContentService). This is not a reimplementation
 * of Code.gs's logic — the real file's source is loaded and run as-is, so a
 * bug introduced directly in Code.gs is caught here. It still cannot prove
 * anything about real Google Sheets/Lock/Properties behavior — see
 * google-apps-script/SETUP.md for what remains unverified against a real
 * deployment.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_GS_PATH = path.resolve(__dirname, "../google-apps-script/Code.gs");
const CODE_GS_SOURCE = fs.readFileSync(CODE_GS_PATH, "utf8");

export type FakeProps = Record<string, string | undefined>;

export type AccessLogEntry =
  | { type: "openById"; id: string }
  | { type: "getSheetByName"; name: string }
  | { type: "flush" }
  | { type: "insertSheet"; name: string };

export class FakeSheetState {
  /** 1-indexed via helper methods; index 0 of this array is sheet row 1. */
  table: unknown[][] = [];
  tabName: string | null;
  sheetExists: boolean;
  numberFormatCalls: Array<{ row: number; col: number; numRows: number; numCols: number; fmt: string }> = [];
  flushCount = 0;
  throwOnAppendWrite = false;
  throwOnFlush = false;

  constructor(opts: { tabName?: string | null; header?: unknown[] | null; rows?: unknown[][] } = {}) {
    this.tabName = opts.tabName === undefined ? "Bookings" : opts.tabName;
    this.sheetExists = opts.tabName !== null;
    if (opts.header) this.table.push(opts.header.slice());
    if (opts.rows) for (const row of opts.rows) this.table.push(row.slice());
  }
}

export class FakeLockState {
  locked = false;
  acquireCount = 0;
  releaseCount = 0;
}

export interface GasHarness {
  doPost(e: { postData: { contents: string } } | null): { ok: boolean; requestId?: string; outcome?: string; error?: string };
  initializeSheet(): void;
  accessLog: AccessLogEntry[];
}

function makeRange(table: unknown[][], row: number, col: number, numRows: number, numCols: number, state: FakeSheetState) {
  return {
    getValues(): unknown[][] {
      const result: unknown[][] = [];
      for (let r = 0; r < numRows; r++) {
        const rowArr: unknown[] = [];
        const srcRow = table[row - 1 + r] ?? [];
        for (let c = 0; c < numCols; c++) {
          const v = srcRow[col - 1 + c];
          rowArr.push(v === undefined ? "" : v);
        }
        result.push(rowArr);
      }
      return result;
    },
    setValues(values: unknown[][]): void {
      if (state.throwOnAppendWrite) {
        throw new Error("simulated Sheets write failure");
      }
      for (let r = 0; r < numRows; r++) {
        const targetRowIdx = row - 1 + r;
        while (table.length <= targetRowIdx) table.push([]);
        const destRow = table[targetRowIdx] as unknown[];
        for (let c = 0; c < numCols; c++) {
          destRow[col - 1 + c] = values[r][c];
        }
      }
    },
    setNumberFormat(fmt: string) {
      state.numberFormatCalls.push({ row, col, numRows, numCols, fmt });
      return this;
    },
  };
}

/** Creates a fresh real-Code.gs execution context bound to the given fake Google-service state. */
export function createGasHarness(opts: { props?: FakeProps; sheet?: FakeSheetState; lock?: FakeLockState } = {}): GasHarness & {
  sheetState: FakeSheetState;
  lockState: FakeLockState;
  props: FakeProps;
} {
  const props: FakeProps = opts.props ?? {};
  const sheetState = opts.sheet ?? new FakeSheetState();
  const lockState = opts.lock ?? new FakeLockState();
  const accessLog: AccessLogEntry[] = [];

  const sandbox: Record<string, unknown> = {
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key: string) {
            const v = props[key];
            return v === undefined ? null : v;
          },
        };
      },
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock(_timeoutMs: number) {
            if (lockState.locked) return false;
            lockState.locked = true;
            lockState.acquireCount++;
            return true;
          },
          releaseLock() {
            lockState.locked = false;
            lockState.releaseCount++;
          },
        };
      },
    },
    SpreadsheetApp: {
      openById(id: string) {
        accessLog.push({ type: "openById", id });
        return {
          getSheetByName(name: string) {
            accessLog.push({ type: "getSheetByName", name });
            if (!sheetState.sheetExists || sheetState.tabName !== name) return null;
            return {
              getLastRow() {
                return sheetState.table.length;
              },
              getRange(row: number, col: number, numRows = 1, numCols = 1) {
                return makeRange(sheetState.table, row, col, numRows, numCols, sheetState);
              },
              setFrozenRows(_n: number) {},
            };
          },
          insertSheet(name: string) {
            accessLog.push({ type: "insertSheet", name });
            sheetState.tabName = name;
            sheetState.sheetExists = true;
            return {
              getLastRow() {
                return sheetState.table.length;
              },
              getRange(row: number, col: number, numRows = 1, numCols = 1) {
                return makeRange(sheetState.table, row, col, numRows, numCols, sheetState);
              },
              setFrozenRows(_n: number) {},
            };
          },
        };
      },
      flush() {
        accessLog.push({ type: "flush" });
        sheetState.flushCount++;
        if (sheetState.throwOnFlush) {
          throw new Error("simulated flush failure");
        }
      },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      computeDigest(_algorithm: string, text: string): number[] {
        const buf = crypto.createHash("sha256").update(text, "utf8").digest();
        const bytes: number[] = [];
        for (let i = 0; i < buf.length; i++) {
          const b = buf[i];
          bytes.push(b > 127 ? b - 256 : b);
        }
        return bytes;
      },
      base64Encode(bytes: number[]): string {
        const buf = Buffer.from(bytes.map((b) => (b < 0 ? b + 256 : b)));
        return buf.toString("base64");
      },
      formatDate(date: Date, timeZone: string, _format: string): string {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        return formatter.format(date);
      },
    },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput(text: string) {
        const out = {
          _text: text,
          _mime: null as string | null,
          setMimeType(mime: string) {
            out._mime = mime;
            return out;
          },
          getContent() {
            return out._text;
          },
          getMimeType() {
            return out._mime;
          },
        };
        return out;
      },
    },
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(CODE_GS_SOURCE, context, { filename: "Code.gs" });

  return {
    doPost(e) {
      const result = (context as any).doPost(e);
      return JSON.parse(result.getContent());
    },
    initializeSheet() {
      (context as any).initializeSheet();
    },
    accessLog,
    sheetState,
    lockState,
    props,
  };
}

export function validHeader(): string[] {
  return [
    "Request ID",
    "Received Timestamp",
    "Full Name",
    "Email",
    "Phone",
    "Unit ID",
    "Check-in",
    "Check-out",
    "Guests",
    "Message",
    "Status",
    "Fingerprint (internal, for duplicate detection)",
  ];
}
