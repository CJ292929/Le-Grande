import { useEffect, useState } from "react";

export type PublicMedia = {
  id: number;
  sectionKey: string;
  unitKey: string | null;
  photoType: string;
  imageUrl: string;
  imageAlt: string;
  displayOrder: number;
  isCover: number;
  isPublished: number;
};

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#103848"/><path d="M0 650L260 450l160 110 180-220 250 240 180-140 170 160v200H0z" fill="#c9ae72" opacity=".35"/><circle cx="880" cy="210" r="82" fill="#d4bd87" opacity=".7"/><text x="600" y="420" fill="#f5f3ed" font-family="Georgia,serif" font-size="44" text-anchor="middle">Le Grand Homestay</text><text x="600" y="470" fill="#d4bd87" font-family="Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">PHOTO COMING SOON</text></svg>`)}`;

export function mediaFor(media: PublicMedia[], sectionKey: string, unitKey?: string | null, photoType?: string) {
  return media
    .filter((item) => item.sectionKey === sectionKey && (unitKey === undefined || item.unitKey === (unitKey ?? null)) && (!photoType || item.photoType === photoType))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
}

export function coverFor(media: PublicMedia[], sectionKey: string, unitKey?: string | null) {
  const matches = mediaFor(media, sectionKey, unitKey);
  return matches.find((item) => item.isCover) ?? matches[0];
}

export function MediaImage({ src, alt, className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [currentSrc, setCurrentSrc] = useState(src || PLACEHOLDER_IMAGE);
  useEffect(() => setCurrentSrc(src || PLACEHOLDER_IMAGE), [src]);
  return <img {...props} className={className} src={currentSrc} alt={alt} onError={() => setCurrentSrc(PLACEHOLDER_IMAGE)} />;
}
