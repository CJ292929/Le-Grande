import { ArrowUpRight, CalendarDays, Loader2, Users } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { units } from "@shared/units";
import { BOOKING_HONEYPOT_FIELD, type BookingFormValues } from "@shared/booking";

type Status =
  | { kind: "idle" }
  | { kind: "success"; requestId: string }
  | { kind: "error"; message: string };

type BookingFormProps = {
  form: UseFormReturn<BookingFormValues>;
  status: Status;
  isSubmitting: boolean;
  onSubmit: () => void;
  idPrefix: string;
};

export default function BookingForm({ form, status, isSubmitting, onSubmit, idPrefix }: BookingFormProps) {
  const {
    register,
    formState: { errors },
  } = form;

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const errorId = (name: string) => (errors[name as keyof BookingFormValues] ? `${idPrefix}-${name}-error` : undefined);

  return (
    <form className="booking-form booking-form--modal" onSubmit={onSubmit} noValidate>
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
            rows={3}
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
