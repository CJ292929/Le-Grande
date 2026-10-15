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

// Supplied unit photos are generated as WebP variants (thumb 320x400, card 720x900,
// full 1122x1402) that share a common base path: `${base}-${variant}.webp`.
export const VARIANT_SIZE = {
  thumb: { width: 320, height: 400 },
  card: { width: 720, height: 900 },
  full: { width: 1122, height: 1402 },
} as const;

export function variantUrl(base: string, variant: keyof typeof VARIANT_SIZE) {
  return `${base}-${variant}.webp`;
}

export function cardSrcSet(base: string) {
  return `${variantUrl(base, "card")} 720w, ${variantUrl(base, "full")} 1122w`;
}

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#103848"/><path d="M0 650L260 450l160 110 180-220 250 240 180-140 170 160v200H0z" fill="#c9ae72" opacity=".35"/><circle cx="880" cy="210" r="82" fill="#d4bd87" opacity=".7"/><text x="600" y="420" fill="#f5f3ed" font-family="Georgia,serif" font-size="44" text-anchor="middle">Le Grand Homestay</text><text x="600" y="470" fill="#d4bd87" font-family="Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">PHOTO COMING SOON</text></svg>`)}`;

// Vercel serves the public Vite app without the Manus tRPC/database runtime.
// Keep a curated fallback catalog so the public site never loses its photography.
// Hero and property-gallery photos are real supplied unit interiors — no stock imagery.
export const STATIC_MEDIA: PublicMedia[] = [
  [-1, "hero", null, "cover", "/units/residence-ii/bright-compact-airbnb-living-and-kitchen-1", "Residence II living area and kitchen", 0, 1],
  [-2, "property-gallery", null, "gallery", "/units/residence-i/elegant-dining-nook-with-framed-artwork", "Residence I dining nook with framed artwork", 0, 1],
  [-3, "property-gallery", null, "gallery", "/units/residence-ii/warm-wood-bedroom-with-lavender-linens", "Residence II bedroom with lavender linens", 1, 0],
  [-4, "property-gallery", null, "gallery", "/units/residence-iii/moonlit-balcony-with-bistro-charm-1", "Residence III balcony with bistro seating at night", 2, 0],
  [-5, "property-gallery", null, "gallery", "/units/residence-iv/bright-compact-l-shaped-kitchen-1", "Residence IV L-shaped kitchen", 3, 0],

  // Residence I — actual unit photos (/units/residence-i)
  [-110, "unit", "residence-i", "cover", "/units/residence-i/polished-airbnb-bunk-bedroom", "Residence I bunk bedroom", 0, 1],
  [-111, "unit", "residence-i", "bedroom", "/units/residence-i/bright-floral-bunk-bedroom", "Residence I bunk bedroom with floral accents", 1, 0],
  [-112, "unit", "residence-i", "bedroom", "/units/residence-i/bright-upstairs-room-with-bunk-and-stairwell", "Residence I upstairs bunk room and stairwell", 2, 0],
  [-113, "unit", "residence-i", "kitchen", "/units/residence-i/inviting-kitchenette-with-marble-bar-and-stools", "Residence I kitchenette with marble bar and stools", 3, 0],
  [-114, "unit", "residence-i", "kitchen", "/units/residence-i/refined-compact-airbnb-kitchen", "Residence I compact kitchen", 4, 0],
  [-115, "unit", "residence-i", "kitchen", "/units/residence-i/refined-kitchenette-with-gridded-window", "Residence I kitchenette with gridded window", 5, 0],
  [-116, "unit", "residence-i", "bathroom", "/units/residence-i/bright-marble-shower-with-rain-head", "Residence I bathroom with marble rain shower", 6, 0],
  [-117, "unit", "residence-i", "bathroom", "/units/residence-i/refined-compact-bathroom-with-marble-accent", "Residence I compact bathroom with marble accent", 7, 0],
  [-118, "unit", "residence-i", "dining", "/units/residence-i/elegant-dining-nook-with-framed-artwork", "Residence I dining nook with framed artwork", 8, 0],
  [-119, "unit", "residence-i", "common", "/units/residence-i/elegant-upstairs-landing-and-stairwell", "Residence I upstairs landing and stairwell", 9, 0],
  [-120, "unit", "residence-i", "common", "/units/residence-i/upstairs-landing-with-glass-pendant-lights", "Residence I upstairs landing with glass pendant lights", 10, 0],
  [-121, "unit", "residence-i", "common", "/units/residence-i/geometric-railing-toward-an-open-door", "Residence I railing toward an open door", 11, 0],
  [-122, "unit", "residence-i", "balcony", "/units/residence-i/elegant-mosaic-balcony-retreat-at-night", "Residence I mosaic balcony at night", 12, 0],

  // Residence II — actual unit photos (/units/residence-ii)
  [-210, "unit", "residence-ii", "cover", "/units/residence-ii/bright-compact-airbnb-living-and-kitchen-1", "Residence II living area and kitchen", 0, 1],
  [-211, "unit", "residence-ii", "common", "/units/residence-ii/double-height-living-room-from-upstairs", "Residence II double-height living room viewed from upstairs", 1, 0],
  [-212, "unit", "residence-ii", "common", "/units/residence-ii/overhead-living-room-with-staircase-7", "Residence II living room with staircase", 2, 0],
  [-213, "unit", "residence-ii", "common", "/units/residence-ii/warm-modern-living-room-and-kitchen-3", "Residence II living room and kitchen", 3, 0],
  [-214, "unit", "residence-ii", "kitchen", "/units/residence-ii/wood-slat-breakfast-bar-with-pendant-lights-2", "Residence II breakfast bar with pendant lights", 4, 0],
  [-215, "unit", "residence-ii", "bedroom", "/units/residence-ii/warm-wood-bedroom-with-lavender-linens", "Residence II bedroom with lavender linens", 5, 0],
  [-216, "unit", "residence-ii", "bedroom", "/units/residence-ii/warm-airbnb-bedroom-with-curved-spindle-bed-4", "Residence II bedroom with curved spindle bed", 6, 0],
  [-217, "unit", "residence-ii", "bedroom", "/units/residence-ii/tropical-bedroom-with-warm-wood-accents-6", "Residence II bedroom with tropical wood accents", 7, 0],
  [-218, "unit", "residence-ii", "bedroom", "/units/residence-ii/curved-wood-bed-in-warm-light-5", "Residence II bedroom with curved wood bed", 8, 0],
  [-219, "unit", "residence-ii", "bedroom", "/units/residence-ii/bedroom-corner-with-ac-lamp-and-headboard-1", "Residence II bedroom corner with air conditioning and lamp", 9, 0],
  [-220, "unit", "residence-ii", "bathroom", "/units/residence-ii/compact-bathroom-with-glass-shower", "Residence II bathroom with glass shower", 10, 0],
  [-221, "unit", "residence-ii", "common", "/units/residence-ii/serene-wood-desk-nook-with-bamboo-art", "Residence II desk nook with bamboo art", 11, 0],
  [-222, "unit", "residence-ii", "common", "/units/residence-ii/under-stair-tv-shelf-with-orchids-2", "Residence II under-stair TV shelf with orchids", 12, 0],
  [-223, "unit", "residence-ii", "common", "/units/residence-ii/under-stair-tv-display-with-greenery-8", "Residence II under-stair TV display with greenery", 13, 0],
  [-224, "unit", "residence-ii", "common", "/units/residence-ii/five-blade-fan-above-a-warm-landing-3", "Residence II landing with ceiling fan", 14, 0],
  [-225, "unit", "residence-ii", "balcony", "/units/residence-ii/warm-evening-balcony-with-planters", "Residence II balcony with planters at evening", 15, 0],

  // Residence III — actual unit photos (/units/residence-iii)
  [-310, "unit", "residence-iii", "cover", "/units/residence-iii/elegant-black-loveseat-with-gold-accents-5", "Residence III living area with black loveseat and gold accents", 0, 1],
  [-311, "unit", "residence-iii", "common", "/units/residence-iii/gold-accented-sitting-nook-with-floral-art-6", "Residence III sitting nook with floral art", 1, 0],
  [-312, "unit", "residence-iii", "common", "/units/residence-iii/gold-console-roses-and-koi-art-8", "Residence III console with roses and koi art", 2, 0],
  [-313, "unit", "residence-iii", "common", "/units/residence-iii/black-marble-under-stair-tv-wall-7", "Residence III under-stair TV wall with black marble", 3, 0],
  [-314, "unit", "residence-iii", "bedroom", "/units/residence-iii/compact-loft-bedroom-with-mountain-art-2", "Residence III loft bedroom with mountain art", 4, 0],
  [-315, "unit", "residence-iii", "common", "/units/residence-iii/double-height-stairwell-with-crystal-chandelier-3", "Residence III double-height stairwell with crystal chandelier", 5, 0],
  [-316, "unit", "residence-iii", "common", "/units/residence-iii/refined-stairwell-with-crystal-chandelier-4", "Residence III stairwell with crystal chandelier", 6, 0],
  [-317, "unit", "residence-iii", "common", "/units/residence-iii/elegant-stairway-to-mountain-view-loft-9", "Residence III stairway to mountain-view loft", 7, 0],
  [-318, "unit", "residence-iii", "balcony", "/units/residence-iii/moonlit-balcony-with-bistro-charm-1", "Residence III balcony with bistro seating at night", 8, 0],
  [-319, "unit", "residence-iii", "balcony", "/units/residence-iii/warm-greek-key-balcony-at-night-10", "Residence III Greek-key balcony at night", 9, 0],
  [-320, "unit", "residence-iii", "balcony", "/units/residence-iii/warm-greek-key-balcony-facade-at-night-12", "Residence III Greek-key balcony facade at night", 10, 0],
  [-321, "unit", "residence-iii", "balcony", "/units/residence-iii/refined-narrow-balcony-under-night-light-11", "Residence III narrow balcony under night light", 11, 0],

  // Residence IV — actual unit photos (/units/residence-iv)
  [-410, "unit", "residence-iv", "cover", "/units/residence-iv/bright-compact-l-shaped-kitchen-1", "Residence IV L-shaped kitchen", 0, 1],
  [-411, "unit", "residence-iv", "common", "/units/residence-iv/polished-under-stair-tv-nook-4", "Residence IV under-stair TV nook", 1, 0],
  [-412, "unit", "residence-iv", "common", "/units/residence-iv/refined-under-stair-tv-cabinetry-3", "Residence IV under-stair TV cabinetry", 2, 0],
  [-413, "unit", "residence-iv", "common", "/units/residence-iv/warm-stairwell-with-gold-trimmed-railing-7", "Residence IV stairwell with gold-trimmed railing", 3, 0],
  [-414, "unit", "residence-iv", "bathroom", "/units/residence-iv/compact-bathroom-with-marble-accent-2", "Residence IV bathroom with marble accent", 4, 0],
  [-415, "unit", "residence-iv", "balcony", "/units/residence-iv/night-balcony-with-bistro-seating-and-conifers-5", "Residence IV balcony with bistro seating at night", 5, 0],
  [-416, "unit", "residence-iv", "balcony", "/units/residence-iv/warm-airbnb-balcony-with-planters-6", "Residence IV balcony with planters", 6, 0],
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
