import { BOOKING_HONEYPOT_FIELD, type BookingFormValues } from "@shared/booking";
import { units } from "@shared/units";

export function defaultBookingValues(unitId?: string): BookingFormValues {
  return {
    fullName: "",
    email: "",
    phone: "",
    unitId: unitId || units[0]!.id,
    checkIn: "",
    checkOut: "",
    guests: 2,
    message: "",
    [BOOKING_HONEYPOT_FIELD]: "",
  };
}

/**
 * Applies a unit preselection without touching any other field. Reopening
 * the shared modal for a different unit must never silently clear contact
 * details the guest already typed.
 */
export function applyUnitPreselection(
  values: BookingFormValues,
  unitId: string | undefined
): BookingFormValues {
  if (!unitId || values.unitId === unitId) return values;
  return { ...values, unitId };
}
