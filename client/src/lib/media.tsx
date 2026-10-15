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

// Vercel serves the public Vite app without the Manus tRPC/database runtime.
// Keep a curated fallback catalog so the public site never loses its photography.
export const STATIC_MEDIA: PublicMedia[] = [
  [-1, "hero", null, "cover", "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2400&q=90", "Tropical resort exterior at dusk", 0, 1],
  [-2, "property-gallery", null, "gallery", "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=85", "Tropical pool and garden at Le Grand Homestay", 0, 1],
  [-3, "property-gallery", null, "gallery", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85", "Quiet bedroom interior", 1, 0],
  [-4, "property-gallery", null, "gallery", "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85", "Warmly lit residence interior", 2, 0],
  [-11, "unit", "residence-i", "cover", "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1400&q=85", "Le Grand Homestay Residence I", 0, 1],
  [-12, "unit", "residence-i", "bedroom", "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85", "Residence I bedroom", 1, 0],
  [-21, "unit", "residence-ii", "cover", "https://images.unsplash.com/photo-1582610116397-edb318620f90?auto=format&fit=crop&w=1400&q=85", "Le Grand Homestay Residence II", 0, 1],
  [-22, "unit", "residence-ii", "bedroom", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85", "Residence II bedroom", 1, 0],
  [-31, "unit", "residence-iii", "cover", "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=85", "Le Grand Homestay Residence III", 0, 1],
  [-32, "unit", "residence-iii", "bedroom", "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85", "Residence III bedroom", 1, 0],
  [-41, "unit", "residence-iv", "cover", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85", "Le Grand Homestay Residence IV", 0, 1],
  [-42, "unit", "residence-iv", "bedroom", "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85", "Residence IV bedroom", 1, 0],
].map(([id, sectionKey, unitKey, photoType, imageUrl, imageAlt, displayOrder, isCover]) => ({ id, sectionKey, unitKey, photoType, imageUrl, imageAlt, displayOrder, isCover, isPublished: 1 } as PublicMedia));

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
