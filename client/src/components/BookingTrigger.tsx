import type { MouseEvent, ReactNode } from "react";
import { useBookingModal } from "@/contexts/booking-modal";

type BookingTriggerProps = {
  unitId?: string;
  className?: string;
  children: ReactNode;
};

export default function BookingTrigger({ unitId, className, children }: BookingTriggerProps) {
  const { openBooking } = useBookingModal();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    openBooking(unitId, event.currentTarget);
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
