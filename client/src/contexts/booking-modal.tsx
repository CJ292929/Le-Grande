import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingFormSchema, type BookingFormValues } from "@shared/booking";
import { fingerprintOf, requestIdFor, submitBooking } from "@/lib/booking";
import { applyUnitPreselection, defaultBookingValues } from "@/lib/booking-modal-state";

type Status =
  | { kind: "idle" }
  | { kind: "success"; requestId: string }
  | { kind: "error"; message: string };

type Attempt = { fingerprint: string; requestId: string };

type BookingModalContextValue = {
  isOpen: boolean;
  isSubmitting: boolean;
  form: UseFormReturn<BookingFormValues>;
  status: Status;
  openBooking: (unitId?: string, opener?: HTMLElement | null) => void;
  closeBooking: () => void;
  onSubmit: () => void;
  consumeOpener: () => HTMLElement | null;
};

const BookingModalContext = createContext<BookingModalContextValue | null>(null);

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  // Lives in the always-mounted provider (not the Dialog content) so a retry
  // of an unchanged payload keeps its identity across close/reopen, and an
  // in-flight request is never cancelled or duplicated by that close/reopen.
  const lastAttempt = useRef<Attempt | null>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: defaultBookingValues(),
  });

  const openBooking = useCallback(
    (unitId?: string, opener?: HTMLElement | null) => {
      const current = form.getValues();
      const preselected = applyUnitPreselection(current, unitId);
      if (preselected !== current) {
        form.setValue("unitId", preselected.unitId, { shouldDirty: true });
      }
      openerRef.current = opener ?? (document.activeElement as HTMLElement | null);
      // Other full-screen dialogs (the gallery lightbox) must never stack behind
      // this one — tell them to close before the booking dialog takes over.
      window.dispatchEvent(new Event("lgh:booking-opening"));
      setIsOpen(true);
    },
    [form]
  );

  const closeBooking = useCallback(() => {
    setIsOpen(false);
  }, []);

  const consumeOpener = useCallback(() => openerRef.current, []);

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const fingerprint = fingerprintOf(values);
      const requestId = requestIdFor(fingerprint, lastAttempt.current);
      const result = await submitBooking(values, requestId);

      if (result.status === "success") {
        lastAttempt.current = null;
        setStatus({ kind: "success", requestId: result.requestId });
        form.reset(defaultBookingValues(values.unitId));
        return;
      }

      lastAttempt.current = { fingerprint, requestId };
      if (result.status === "invalid" || result.status === "conflict" || result.status === "unavailable") {
        setStatus({ kind: "error", message: result.error });
      } else {
        setStatus({
          kind: "error",
          message: "We couldn't confirm your booking request was saved. Please try again — your details are still here.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <BookingModalContext.Provider
      value={{ isOpen, isSubmitting, form, status, openBooking, closeBooking, onSubmit, consumeOpener }}
    >
      {children}
    </BookingModalContext.Provider>
  );
}

export function useBookingModal() {
  const ctx = useContext(BookingModalContext);
  if (!ctx) throw new Error("useBookingModal must be used within a BookingModalProvider");
  return ctx;
}
