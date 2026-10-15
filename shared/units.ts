/**
 * Static catalog of Le Grand Homestay's four residences.
 *
 * Source of truth for the public site today, and intended as the shared
 * input for future booking validation (not implemented yet — see P2-P2).
 *
 * IDs (`residence-i` .. `residence-iv`) are preserved from the previous
 * client-only `units` array in Home.tsx and are referenced by existing
 * media keys (shared/media catalog) — do not change them without updating
 * every unitKey reference.
 *
 * UNVERIFIED: guest capacities (2 / 4 / 4 / 3) were carried over from the
 * prior copy as-is. They have not been confirmed by the property owner.
 * Do not treat them as authoritative, and do not build booking/guest-limit
 * validation on top of them until the owner confirms real capacities.
 */
export type Unit = {
  id: string;
  number: string;
  name: string;
  description: string;
  guests: string;
  beds: string;
  bath: string;
  size: string;
  availability: string;
};

export const units: Unit[] = [
  {
    id: "residence-i",
    number: "01",
    name: "Le Grand Homestay Residence I",
    description: "A composed retreat for slow mornings, soft light, and private time together.",
    guests: "2 guests",
    beds: "1 king bed",
    bath: "1 bath",
    size: "45 m²",
    availability: "Availability on request",
  },
  {
    id: "residence-ii",
    number: "02",
    name: "Le Grand Homestay Residence II",
    description: "An airy, generous space for families and friends to settle into the island rhythm.",
    guests: "4 guests",
    beds: "2 beds",
    bath: "1 bath",
    size: "58 m²",
    availability: "Availability on request",
  },
  {
    id: "residence-iii",
    number: "03",
    name: "Le Grand Homestay Residence III",
    description: "Warm timber, considered details, and an easy sense of room to breathe.",
    guests: "4 guests",
    beds: "2 beds",
    bath: "1 bath",
    size: "62 m²",
    availability: "Availability on request",
  },
  {
    id: "residence-iv",
    number: "04",
    name: "Le Grand Homestay Residence IV",
    description: "A refined home base for unhurried days, restful nights, and shared escapes.",
    guests: "3 guests",
    beds: "2 beds",
    bath: "1 bath",
    size: "52 m²",
    availability: "Availability on request",
  },
];
