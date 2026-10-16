import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useBookingModal } from "@/contexts/booking-modal";
import BookingForm from "./BookingForm";

export default function BookingModal() {
  const { isOpen, closeBooking, form, status, isSubmitting, onSubmit, consumeOpener } = useBookingModal();

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && closeBooking()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="booking-modal__overlay" />
        <DialogPrimitive.Content
          className="booking-modal__content"
          onCloseAutoFocus={(event) => {
            // Imperative triggers scattered across the page tree aren't
            // Radix's own Dialog.Trigger, so its automatic focus-return
            // heuristic can't be relied on — restore explicitly to the
            // element that actually opened the modal.
            event.preventDefault();
            const opener = consumeOpener();
            opener?.focus();
          }}
        >
          <div className="booking-modal__header">
            <DialogPrimitive.Title className="booking-modal__title">Request a booking</DialogPrimitive.Title>
            <DialogPrimitive.Description className="booking-modal__description">
              Send your stay details and we will confirm availability with a host.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close className="booking-modal__close" aria-label="Close booking form">
              <X size={18} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="booking-modal__body">
            <BookingForm form={form} status={status} isSubmitting={isSubmitting} onSubmit={onSubmit} idPrefix="booking-modal" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
