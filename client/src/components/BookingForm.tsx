import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, CalendarDays, Loader2, Users } from "lucide-react";
import { units } from "@shared/units";
import { BOOKING_HONEYPOT_FIELD, bookingFormSchema, type BookingFormValues } from "@shared/booking";
import { fingerprintOf, requestIdFor, submitBooking } from "@/lib/booking";

type Variant = "bar" | "card";

type BookingFormProps = {
  variant: Variant;
  defaultUnitId?: string;
  idPrefix: string;
  id?: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "success"; requestId: string }
  | { kind: "error"; message: string };

const defaultValuesFor = (defaultUnitId?: string): BookingFormValues => ({
  fullName: "",
  email: "",
  phone: "",
  unitId: defaultUnitId || units[0].id,
  checkIn: "",
  checkOut: "",
  guests: 2,
  message: "",
  [BOOKING_HONEYPOT_FIELD]: "",
});

export default function BookingForm({ variant, defaultUnitId, idPrefix, id }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: defaultValuesFor(defaultUnitId),
  });

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const lastAttempt = useRef<{ fingerprint: string; requestId: string } | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    const fingerprint = fingerprintOf(values);
    const requestId = requestIdFor(fingerprint, lastAttempt.current);

    const result = await submitBooking(values, requestId);

    if (result.status === "success") {
      lastAttempt.current = null;
      setStatus({ kind: "success", requestId: result.requestId });
      reset(defaultValuesFor(defaultUnitId));
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
  });

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const errorId = (name: string) => (errors[name as keyof BookingFormValues] ? `${idPrefix}-${name}-error` : undefined);

  return (
    <form
      id={id}
      className={variant === "bar" ? "booking-form booking-form--bar" : "booking-form booking-form--card"}
      onSubmit={onSubmit}
      noValidate
    >
      {variant === "bar" && (
        <div className="booking-form__intro">
          <span className="booking-bar__kicker">Begin your stay</span>
          <strong>Plan your escape</strong>
        </div>
      )}
      {variant === "card" && (
        <>
          <h3>Plan your stay</h3>
          <p>Send a booking request and we will confirm availability with a host.</p>
        </>
      )}

      <div className="booking-form__grid">
        <label className="booking-form__field" htmlFor={fieldId("fullName")}>
          <span>Full name</span>
          <input
            id={fieldId("fullName")}
            type="text"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errorId("fullName")}
            {...register("fullName")}
          />
          {errors.fullName && <small id={errorId("fullName")} className="booking-form__error">{errors.fullName.message}</small>}
        </label>

        <label className="booking-form__field" htmlFor={fieldId("email")}>
          <span>Email</span>
          <input
            id={fieldId("email")}
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errorId("email")}
            {...register("email")}
          />
          {errors.email && <small id={errorId("email")} className="booking-form__error">{errors.email.message}</small>}
        </label>

        <label className="booking-form__field" htmlFor={fieldId("phone")}>
          <span>Phone (optional)</span>
          <input
            id={fieldId("phone")}
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={errorId("phone")}
            {...register("phone")}
          />
          {errors.phone && <small id={errorId("phone")} className="booking-form__error">{errors.phone.message}</small>}
        </label>

        <label className="booking-form__field" htmlFor={fieldId("unitId")}>
          <span>Residence</span>
          <select id={fieldId("unitId")} aria-invalid={!!errors.unitId} aria-describedby={errorId("unitId")} {...register("unitId")}>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          {errors.unitId && <small id={errorId("unitId")} className="booking-form__error">{errors.unitId.message}</small>}
        </label>

        <label className="booking-form__field" htmlFor={fieldId("checkIn")}>
          <span><CalendarDays size={14} /> Check-in</span>
          <input
            id={fieldId("checkIn")}
            type="date"
            aria-invalid={!!errors.checkIn}
            aria-describedby={errorId("checkIn")}
            {...register("checkIn")}
          />
          {errors.checkIn && <small id={errorId("checkIn")} className="booking-form__error">{errors.checkIn.message}</small>}
        </label>

        <label className="booking-form__field" htmlFor={fieldId("checkOut")}>
          <span><CalendarDays size={14} /> Check-out</span>
          <input
            id={fieldId("checkOut")}
            type="date"
            aria-invalid={!!errors.checkOut}
            aria-describedby={errorId("checkOut")}
            {...register("checkOut")}
          />
          {errors.checkOut && <small id={errorId("checkOut")} className="booking-form__error">{errors.checkOut.message}</small>}
        </label>

        <label className="booking-form__field" htmlFor={fieldId("guests")}>
          <span><Users size={14} /> Guests</span>
          <input
            id={fieldId("guests")}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            aria-invalid={!!errors.guests}
            aria-describedby={errorId("guests")}
            {...register("guests", { valueAsNumber: true })}
          />
          {errors.guests && <small id={errorId("guests")} className="booking-form__error">{errors.guests.message}</small>}
        </label>

        <label className="booking-form__field booking-form__field--wide" htmlFor={fieldId("message")}>
          <span>Message (optional)</span>
          <textarea
            id={fieldId("message")}
            rows={variant === "bar" ? 2 : 3}
            maxLength={1000}
            aria-invalid={!!errors.message}
            aria-describedby={errorId("message")}
            {...register("message")}
          />
          {errors.message && <small id={errorId("message")} className="booking-form__error">{errors.message.message}</small>}
        </label>
      </div>

      {/* Honeypot: hidden from sighted and keyboard users, a real visitor never fills this in. */}
      <div className="booking-form__honeypot" aria-hidden="true">
        <label htmlFor={fieldId("companyWebsite")}>Company website</label>
        <input
          id={fieldId("companyWebsite")}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register(BOOKING_HONEYPOT_FIELD)}
        />
      </div>

      <button className="button button--gold booking-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={16} className="booking-form__spinner" /> : <ArrowUpRight size={16} />}
        Send booking request
      </button>
      <small className="booking-form__note">Subject to availability and guest-capacity confirmation.</small>

      <div aria-live="polite" className="booking-form__status">
        {status.kind === "success" && (
          <p className="booking-form__status--success">
            Your booking request was saved (reference {status.requestId.slice(0, 8)}). We'll confirm availability and guest-capacity by email.
          </p>
        )}
        {status.kind === "error" && <p className="booking-form__status--error">{status.message}</p>}
      </div>
    </form>
  );
}
