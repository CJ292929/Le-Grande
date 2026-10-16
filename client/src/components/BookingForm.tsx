import { ArrowUpRight, CalendarDays, Loader2, Users } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { units } from "@shared/units";
import { BOOKING_HONEYPOT_FIELD, type BookingFormValues } from "@shared/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    control,
    formState: { errors },
  } = form;

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const errorId = (name: string) => (errors[name as keyof BookingFormValues] ? `${idPrefix}-${name}-error` : undefined);

  return (
    <form className="booking-form booking-form--modal" onSubmit={onSubmit} noValidate>
      <div className="booking-form__grid">
        <div className="booking-form__field">
          <Label htmlFor={fieldId("fullName")}>Full name</Label>
          <div className="booking-form__field-control">
            <Input
              id={fieldId("fullName")}
              type="text"
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              aria-describedby={errorId("fullName")}
              {...register("fullName")}
            />
          </div>
          {errors.fullName && <small id={errorId("fullName")} className="booking-form__error">{errors.fullName.message}</small>}
        </div>

        <div className="booking-form__field">
          <Label htmlFor={fieldId("email")}>Email</Label>
          <div className="booking-form__field-control">
            <Input
              id={fieldId("email")}
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errorId("email")}
              {...register("email")}
            />
          </div>
          {errors.email && <small id={errorId("email")} className="booking-form__error">{errors.email.message}</small>}
        </div>

        <div className="booking-form__field">
          <Label htmlFor={fieldId("phone")}>Phone (optional)</Label>
          <div className="booking-form__field-control">
            <Input
              id={fieldId("phone")}
              type="tel"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              aria-describedby={errorId("phone")}
              {...register("phone")}
            />
          </div>
          {errors.phone && <small id={errorId("phone")} className="booking-form__error">{errors.phone.message}</small>}
        </div>

        <div className="booking-form__field">
          <Label htmlFor={fieldId("unitId")}>Residence</Label>
          <div className="booking-form__field-control">
            <Controller
              name="unitId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                  <SelectTrigger id={fieldId("unitId")} className="w-full" aria-invalid={!!errors.unitId} aria-describedby={errorId("unitId")} onBlur={field.onBlur}>
                    <SelectValue placeholder="Select a residence" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {errors.unitId && <small id={errorId("unitId")} className="booking-form__error">{errors.unitId.message}</small>}
        </div>

        <div className="booking-form__field">
          <Label htmlFor={fieldId("checkIn")}><CalendarDays size={14} /> Check-in</Label>
          <div className="booking-form__field-control">
            <Input
              id={fieldId("checkIn")}
              type="date"
              aria-invalid={!!errors.checkIn}
              aria-describedby={errorId("checkIn")}
              {...register("checkIn")}
            />
          </div>
          {errors.checkIn && <small id={errorId("checkIn")} className="booking-form__error">{errors.checkIn.message}</small>}
        </div>

        <div className="booking-form__field">
          <Label htmlFor={fieldId("checkOut")}><CalendarDays size={14} /> Check-out</Label>
          <div className="booking-form__field-control">
            <Input
              id={fieldId("checkOut")}
              type="date"
              aria-invalid={!!errors.checkOut}
              aria-describedby={errorId("checkOut")}
              {...register("checkOut")}
            />
          </div>
          {errors.checkOut && <small id={errorId("checkOut")} className="booking-form__error">{errors.checkOut.message}</small>}
        </div>

        <div className="booking-form__field">
          <Label htmlFor={fieldId("guests")}><Users size={14} /> Guests</Label>
          <div className="booking-form__field-control">
            <Input
              id={fieldId("guests")}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              aria-invalid={!!errors.guests}
              aria-describedby={errorId("guests")}
              {...register("guests", { valueAsNumber: true })}
            />
          </div>
          {errors.guests && <small id={errorId("guests")} className="booking-form__error">{errors.guests.message}</small>}
        </div>

        <div className="booking-form__field booking-form__field--wide">
          <Label htmlFor={fieldId("message")}>Message (optional)</Label>
          <div className="booking-form__field-control">
            <Textarea
              id={fieldId("message")}
              rows={3}
              maxLength={1000}
              aria-invalid={!!errors.message}
              aria-describedby={errorId("message")}
              {...register("message")}
            />
          </div>
          {errors.message && <small id={errorId("message")} className="booking-form__error">{errors.message.message}</small>}
        </div>
      </div>

      {/* Honeypot: hidden from sighted and keyboard users, a real visitor never fills this in. */}
      <div className="booking-form__honeypot" aria-hidden="true">
        <Label htmlFor={fieldId("companyWebsite")}>Company website</Label>
        <Input
          id={fieldId("companyWebsite")}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register(BOOKING_HONEYPOT_FIELD)}
        />
      </div>

      <Button type="submit" className="button button--gold booking-form__submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 size={16} className="booking-form__spinner" /> : <ArrowUpRight size={16} />}
        Send booking request
      </Button>
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
