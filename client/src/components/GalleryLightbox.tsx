import { useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { variantUrl, type PublicMedia } from "@/lib/media";

export type LightboxImage = Pick<PublicMedia, "id" | "imageUrl" | "imageAlt">;

type GalleryLightboxProps = {
  images: LightboxImage[];
  index: number;
  opener: HTMLElement | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export default function GalleryLightbox({ images, index, opener, onIndexChange, onClose }: GalleryLightboxProps) {
  const openerRef = useRef(opener);
  openerRef.current = opener;

  // A dialog opening elsewhere (the booking modal) must take sole ownership of
  // the screen — close this one rather than let two full-screen overlays stack.
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("lgh:booking-opening", close);
    return () => window.removeEventListener("lgh:booking-opening", close);
  }, [onClose]);

  const image = images[index];
  if (!image) return null;

  const goPrev = () => onIndexChange((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange((index + 1) % images.length);

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="lightbox__overlay" />
        <DialogPrimitive.Content
          className="lightbox__content"
          aria-label="Photo gallery"
          onCloseAutoFocus={(event) => {
            // Imperative triggers (gallery tiles, thumbnails) aren't Radix's own
            // Dialog.Trigger, so its automatic focus-return heuristic can't be
            // relied on — restore explicitly to the element that opened this.
            event.preventDefault();
            openerRef.current?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goPrev();
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              goNext();
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {image.imageAlt || "Residence photo"} — photo {index + 1} of {images.length}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="lightbox__close" aria-label="Close gallery">
            <X size={20} aria-hidden="true" />
          </DialogPrimitive.Close>

          {images.length > 1 && (
            <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label="Previous photo" onClick={goPrev}>
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          )}

          <figure className="lightbox__figure">
            <img
              src={variantUrl(image.imageUrl, "full")}
              alt={image.imageAlt || "Residence photo"}
              width={1122}
              height={1402}
            />
          </figure>

          {images.length > 1 && (
            <button type="button" className="lightbox__nav lightbox__nav--next" aria-label="Next photo" onClick={goNext}>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          )}

          <span className="lightbox__count" aria-hidden="true">{index + 1} / {images.length}</span>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
