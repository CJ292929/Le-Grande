import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { units, type Unit } from "@shared/units";
import { cardSrcSet, coverFor, mediaFor, MediaImage, PLACEHOLDER_IMAGE, STATIC_MEDIA, variantUrl, VARIANT_SIZE, type PublicMedia } from "@/lib/media";
import BookingTrigger from "@/components/BookingTrigger";
import GalleryLightbox, { type LightboxImage } from "@/components/GalleryLightbox";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BedDouble,
  Check,
  Clock3,
  Coffee,
  Droplets,
  Facebook,
  Instagram,
  Menu,
  MapPin,
  ShieldCheck,
  Users,
  Waves,
  Wifi,
  X,
} from "lucide-react";

const HERO_VIDEO_SRC = "/media/hero.mp4";
const HERO_VIDEO_POSTER = "/media/hero-poster.jpg";

function HeroMedia({ poster, alt, reduceMotion }: { poster: string; alt: string; reduceMotion: boolean }) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // When reduceMotion is true, the <video> element is never rendered, so
  // the browser never issues a request for hero.mp4.
  const showVideo = !reduceMotion && !videoFailed;

  return (
    <>
      <img className="hero__image" src={poster} alt={alt} fetchPriority="high" />
      {showVideo && (
        <video
          className={`hero__image hero__video ${videoReady ? "is-ready" : ""}`}
          src={HERO_VIDEO_SRC}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      )}
    </>
  );
}

const navItems = [
  ["The units", "#units"],
  ["Amenities", "#amenities"],
  ["Gallery", "#gallery"],
  ["Location", "#location"],
  ["Contact", "#contact"],
];

function Wordmark() {
  return (
    <a href="/" className="wordmark" aria-label="Le Grand Homestay home">
      <span className="wordmark__mark">LG</span>
      <span className="wordmark__name">LE GRAND HOMESTAY</span>
    </a>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The booking modal must take sole ownership of the screen — close the
  // mobile nav sheet rather than let both overlays stay open behind it.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("lgh:booking-opening", close);
    return () => window.removeEventListener("lgh:booking-opening", close);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
      <div className="container site-header__inner">
        <Wordmark />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <a key={href} href={href}>{label}</a>
          ))}
          <BookingTrigger className="nav-action">
            Request a booking <ArrowUpRight size={15} />
          </BookingTrigger>
        </nav>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <Button
            variant="ghost"
            size="icon-lg"
            className="mobile-nav-trigger text-[var(--text-primary)] hover:bg-[var(--panel-raised)] min-h-11 min-w-11"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} />
          </Button>
          <SheetContent side="right" className="on-light w-[85vw] max-w-[360px] bg-[var(--ink)] border-l border-[var(--border-dark)] p-0">
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <div className="flex flex-col h-full px-6 py-8">
              <div className="flex items-center justify-between mb-8">
                <Wordmark />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="text-[var(--text-primary)]" aria-label="Close menu">
                    <X size={20} />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col" aria-label="Mobile navigation">
                {navItems.map(([label, href]) => (
                  <SheetClose asChild key={href}>
                    <a
                      href={href}
                      className="flex items-center min-h-[56px] text-[var(--text-primary)] text-sm font-semibold uppercase tracking-[.12em] border-b border-[var(--border-dark)]"
                    >
                      {label}
                    </a>
                  </SheetClose>
                ))}
              </nav>
              <SheetClose asChild>
                <BookingTrigger className="nav-action justify-center mt-8">
                  Request a booking <ArrowUpRight size={15} />
                </BookingTrigger>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="section-intro">
      <p className="eyebrow"><span />{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p className="section-intro__copy">{copy}</p>}
    </div>
  );
}

function UnitCard({ unit, media, onOpenPhoto }: { unit: Unit; media: PublicMedia[]; onOpenPhoto: (opener: HTMLElement) => void }) {
  const cover = coverFor(media, "unit", unit.id);
  return (
    <Card className="unit-card p-0 overflow-hidden border-[var(--border-dark)] bg-[var(--panel)] gap-0">
      <div className="unit-card__media">
        <AspectRatio ratio={4 / 3}>
          <button
            type="button"
            className="block w-full h-full cursor-pointer"
            aria-label={`Open full gallery for ${unit.name}`}
            onClick={(event) => onOpenPhoto(event.currentTarget)}
          >
            <MediaImage
              src={cover ? variantUrl(cover.imageUrl, "card") : PLACEHOLDER_IMAGE}
              srcSet={cover ? cardSrcSet(cover.imageUrl) : undefined}
              sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw"
              width={VARIANT_SIZE.card.width}
              height={VARIANT_SIZE.card.height}
              loading="lazy"
              alt={cover?.imageAlt || `${unit.name} at Le Grand Homestay`}
              className="w-full h-full object-cover"
            />
          </button>
        </AspectRatio>
        <div className="unit-card__veil" />
        <span className="unit-card__number">UNIT {unit.number}</span>
        <span className="availability-pill"><span /> {unit.availability}</span>
      </div>
      <CardContent className="px-6 pt-6">
        <div className="flex items-baseline justify-between gap-5">
          <h3 className="text-[var(--text-primary)]" style={{ fontSize: "30px", letterSpacing: "-.02em" }}>{unit.name}</h3>
          <span className="flex-none text-[var(--gold)] text-xs font-semibold">Rates on request</span>
        </div>
        <p className="mt-3 text-[var(--text-secondary)] text-[13px] leading-relaxed max-w-[420px]">{unit.description}</p>
        <div className="unit-card__facts mt-5">
          <span><Users size={15} /> {unit.guests}</span>
          <span><BedDouble size={15} /> {unit.beds}</span>
          <span><Droplets size={15} /> {unit.bath}</span>
          <span><span className="size-icon">m²</span> {unit.size}</span>
        </div>
      </CardContent>
      <CardFooter className="px-6 py-6 mt-5 flex items-center justify-between border-t border-[var(--border-dark)]">
        <Link className="text-link" href={`/unit/${unit.id}`}>View unit <ArrowUpRight size={16} /></Link>
        <BookingTrigger unitId={unit.id} className="button button--panel button--small">Book now</BookingTrigger>
      </CardFooter>
    </Card>
  );
}

function Amenities() {
  const items = [
    ["Comfort", "Air conditioning, private bathroom, hot shower", <Waves size={22} />],
    ["Convenience", "Wi-Fi, refrigerator, fresh linens and towels", <Wifi size={22} />],
    ["Essentials", "Hair dryer and everyday details, thoughtfully prepared", <ShieldCheck size={22} />],
    ["Stay your way", "A calm, private setting for couples, families, and friends", <Coffee size={22} />],
  ];
  return (
    <section className="amenities surface-raised" id="amenities">
      <div className="container">
        <SectionIntro eyebrow="The Le Grand Homestay standard" title="Everything you need for a beautiful stay" copy="The essentials are considered, the atmosphere is unhurried, and the details are there when you need them." />
        <div className="amenity-grid">
          {items.map(([title, copy, icon]) => (
            <Card key={String(title)} className="bg-[var(--panel-raised)] border-[var(--border-dark)] p-6 gap-3">
              <div className="text-[var(--gold)]">{icon}</div>
              <h3 className="text-[var(--text-primary)]" style={{ fontSize: "26px" }}>{title}</h3>
              <p className="text-[var(--text-secondary)] text-[12px] leading-relaxed max-w-[190px]">{copy}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryTile({ item, gridClassName, caption, onOpen }: { item?: PublicMedia; gridClassName?: string; caption: string; onOpen: (opener: HTMLElement) => void }) {
  return (
    <figure className={gridClassName}>
      <button
        type="button"
        className="gallery-tile"
        aria-label={`Open ${caption} in gallery`}
        onClick={(event) => onOpen(event.currentTarget)}
      >
        <MediaImage
          src={item ? variantUrl(item.imageUrl, "card") : PLACEHOLDER_IMAGE}
          srcSet={item ? cardSrcSet(item.imageUrl) : undefined}
          sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 25vw"
          width={VARIANT_SIZE.card.width}
          height={VARIANT_SIZE.card.height}
          loading="lazy"
          alt={item?.imageAlt || "Le Grand Homestay residence interior"}
        />
        <figcaption>{caption} <ArrowUpRight size={15} /></figcaption>
      </button>
    </figure>
  );
}

function Gallery({ media, onOpen }: { media: PublicMedia[]; onOpen: (images: LightboxImage[], index: number, opener: HTMLElement) => void }) {
  const gallery = mediaFor(media, "property-gallery");
  const openAt = (index: number) => (opener: HTMLElement) => onOpen(gallery, index, opener);
  return (
    <section className="gallery surface-base" id="gallery">
      <div className="container">
        <div className="gallery__topline">
          <SectionIntro eyebrow="A sense of place" title="The gallery" />
          <p>A look inside each of our four residences — real rooms, real light.</p>
        </div>
        <div className="gallery-grid">
          <GalleryTile item={gallery[0]} gridClassName="gallery-tile--large" caption="RESIDENCE I" onOpen={openAt(0)} />
          <GalleryTile item={gallery[1]} caption="RESIDENCE II" onOpen={openAt(1)} />
          <GalleryTile item={gallery[2]} caption="RESIDENCE III" onOpen={openAt(2)} />
          <GalleryTile item={gallery[3]} gridClassName="gallery-tile--wide" caption="RESIDENCE IV" onOpen={openAt(3)} />
        </div>
      </div>
    </section>
  );
}

function Location() {
  return (
    <section className="location surface-raised" id="location">
      <div className="container location__grid">
        <div className="location__copy">
          <SectionIntro eyebrow="A softer kind of arrival" title="Your escape starts here" copy="Find Le Grand Homestay at Arella Residences, a calm and convenient base in Bay, Laguna. Save the address below for an easier arrival." />
          <a className="text-link mt-6 inline-flex" href="https://www.google.com/maps/search/?api=1&query=Arella%20Residences%2C%20Pan-Philippine%20Highway%2C%20Brgy.%20Calo%2C%20Bay%2C%20Laguna%204033%2C%20Philippines" target="_blank" rel="noreferrer">Request directions <ArrowUpRight size={16} /></a>
        </div>
        <div className="address-panel">
          <span className="address-panel__eyebrow"><Clock3 size={14} /> Availability on request</span>
          <p className="address-panel__line"><MapPin size={20} /> Arella Residences, Pan-Philippine Highway, Brgy. Calo, Bay, Laguna 4033, Philippines</p>
          <p className="address-panel__note">We don't yet have a live map embedded here — save this exact address for your driver or ride-hailing app.</p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const media = STATIC_MEDIA;
  const hero = coverFor(media, "hero");
  const welcome = coverFor(media, "property-gallery") || hero;
  const { reduceMotion, manualReduce, setManualPreference } = useMotionPreference();
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number; opener: HTMLElement | null } | null>(null);

  const openLightbox = (images: LightboxImage[], index: number, opener: HTMLElement) => setLightbox({ images, index, opener });
  const openUnitLightbox = (unitId: string) => (opener: HTMLElement) => {
    const unitMedia = mediaFor(media, "unit", unitId);
    setLightbox({ images: unitMedia, index: 0, opener });
  };

  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero">
          <HeroMedia
            poster={HERO_VIDEO_POSTER}
            alt={hero?.imageAlt || "Le Grand Homestay residence interior"}
            reduceMotion={reduceMotion}
          />
          <div className="hero__overlay" />
          <div className="hero__grain" />
          <div className="container hero__content">
            <p className="hero__eyebrow">Stay · relax · experience</p>
            <h1 className="hero__title">Le Grand Homestay</h1>
            <p className="hero__lead">Four private residences in Bay, Laguna — a composed, unhurried base for the days you want to remember.</p>
            <div className="hero__actions">
              <a className="button button--ghost" href="#units">Explore residences <ArrowDownRight size={16} /></a>
              <BookingTrigger className="button button--gold">Request a booking <ArrowUpRight size={16} /></BookingTrigger>
            </div>
          </div>
          <div className="hero__panel">
            <strong>04 residences</strong>
            <span><MapPin size={13} /> Arella Residences, Bay, Laguna</span>
          </div>
        </section>

        <section className="welcome surface-raised" id="welcome">
          <div className="container welcome__grid">
            <div className="welcome__copy">
              <SectionIntro eyebrow="Welcome to Le Grand Homestay" title="Where comfort meets the art of escape" copy="Discover a refined stay designed for guests who appreciate comfort, privacy, and effortless relaxation. Le Grand Homestay offers four thoughtfully prepared accommodation units, giving you a beautiful place to rest, reconnect, and enjoy your getaway." />
              <div className="welcome__signature"><span>LG</span><div><strong>Made for moments</strong><small>Your private escape in paradise</small></div></div>
              <a className="text-link" href="#units">Discover the residences <ArrowUpRight size={16} /></a>
            </div>
            <div className="welcome__media">
              <MediaImage
                src={welcome ? variantUrl(welcome.imageUrl, "card") : PLACEHOLDER_IMAGE}
                srcSet={welcome ? cardSrcSet(welcome.imageUrl) : undefined}
                sizes="(max-width: 900px) 100vw, 45vw"
                width={VARIANT_SIZE.card.width}
                height={VARIANT_SIZE.card.height}
                loading="lazy"
                alt={welcome?.imageAlt || "Le Grand Homestay residence interior"}
              />
              <span className="image-caption">The art of doing less</span>
            </div>
          </div>
        </section>

        <section className="units surface-base" id="units">
          <div className="container">
            <div className="units__header"><SectionIntro eyebrow="Our accommodations" title="Choose your perfect stay" /><span className="units__count">04<br /><small>residences</small></span></div>
            <div className="unit-grid">{units.map((unit) => <UnitCard unit={unit} media={media} key={unit.id} onOpenPhoto={openUnitLightbox(unit.id)} />)}</div>
          </div>
        </section>

        <Amenities />
        <Gallery media={media} onOpen={openLightbox} />
        <Location />

        <section className="cta surface-raised">
          <div className="container cta__content">
            <p className="eyebrow"><span />Le Grand Homestay</p>
            <h2>Make your next escape<br /><em>extraordinary.</em></h2>
            <p>Four beautiful spaces. One unforgettable destination.</p>
            <BookingTrigger className="button button--gold">Book your stay <ArrowUpRight size={16} /></BookingTrigger>
          </div>
        </section>
      </main>
      <Footer manualReduce={manualReduce} setManualPreference={setManualPreference} />

      {lightbox && (
        <GalleryLightbox
          images={lightbox.images}
          index={lightbox.index}
          opener={lightbox.opener}
          onIndexChange={(index) => setLightbox((current) => (current ? { ...current, index } : current))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

export function UnitDetail() {
  const params = useParams<{ id: string }>();
  const unit = useMemo(() => units.find((item) => item.id === params.id) ?? units[0], [params.id]);
  const media = STATIC_MEDIA;
  const unitMedia = mediaFor(media, "unit", unit.id);
  const primary = coverFor(media, "unit", unit.id) || coverFor(media, "hero");
  const [activeImage, setActiveImage] = useState(primary?.imageUrl || PLACEHOLDER_IMAGE);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [lightbox, setLightbox] = useState<{ index: number; opener: HTMLElement | null } | null>(null);

  useEffect(() => {
    setActiveImage(primary?.imageUrl || PLACEHOLDER_IMAGE);
    setShowAllPhotos(false);
  }, [primary?.imageUrl]);

  const amenityList = ["Wi-Fi", "Air conditioning", "Private bathroom", "TV", "Refrigerator", "Hot shower", "Linens", "Towels", "Hair dryer"];
  const allGalleryImages = [primary, ...unitMedia.filter((item) => item.id !== primary?.id)].filter((item): item is PublicMedia => Boolean(item));
  const visibleCount = 8;
  const galleryImages = showAllPhotos ? allGalleryImages : allGalleryImages.slice(0, visibleCount);
  const remainingPhotoCount = allGalleryImages.length - visibleCount;
  const activeImageSrc = activeImage === PLACEHOLDER_IMAGE ? PLACEHOLDER_IMAGE : variantUrl(activeImage, "full");
  const activeIndex = Math.max(0, allGalleryImages.findIndex((item) => item.imageUrl === activeImage));
  const { manualReduce, setManualPreference } = useMotionPreference();

  return (
    <div className="site-shell detail-page">
      <Header />
      <main>
        <section className="detail-hero surface-base">
          <div className="container">
            <Link className="back-link" href="/#units"><ArrowLeft size={15} /> Back to residences</Link>
            <div className="detail-hero__grid">
              <div className="detail-gallery">
                <button
                  type="button"
                  className="detail-gallery__main"
                  aria-label="Open photo in gallery"
                  onClick={(event) => setLightbox({ index: activeIndex, opener: event.currentTarget })}
                >
                  <MediaImage src={activeImageSrc} alt={unit.name} width={VARIANT_SIZE.full.width} height={VARIANT_SIZE.full.height} />
                </button>
                <div className="detail-gallery__thumbs">
                  {galleryImages.map((image, index) => (
                    <button
                      type="button"
                      key={image.id}
                      className={activeImage === image.imageUrl ? "is-active" : ""}
                      onClick={() => setActiveImage(image.imageUrl)}
                    >
                      <MediaImage src={variantUrl(image.imageUrl, "thumb")} width={VARIANT_SIZE.thumb.width} height={VARIANT_SIZE.thumb.height} alt={image.imageAlt || `${unit.name} view ${index + 1}`} loading={index === 0 ? undefined : "lazy"} />
                    </button>
                  ))}
                </div>
                {remainingPhotoCount > 0 && !showAllPhotos && (
                  <button type="button" className="text-link detail-gallery__view-all" onClick={() => setShowAllPhotos(true)}>
                    View all {allGalleryImages.length} photos <ArrowUpRight size={16} />
                  </button>
                )}
              </div>
              <div className="detail-copy">
                <p className="eyebrow"><span />Unit {unit.number}</p>
                <h1>{unit.name}</h1>
                <p className="detail-copy__lead">{unit.description} A private, considered base for the days you want to remember.</p>
                <div className="detail-stats">
                  <span><Users size={16} /> {unit.guests}</span>
                  <span><BedDouble size={16} /> {unit.beds}</span>
                  <span><Droplets size={16} /> {unit.bath}</span>
                  <span><span className="size-icon">m²</span> {unit.size}</span>
                </div>
                <div className="detail-price"><span>Rates</span><strong>Contact us for rates</strong></div>
                <BookingTrigger unitId={unit.id} className="button button--gold">Book this unit <ArrowUpRight size={16} /></BookingTrigger>
              </div>
            </div>
          </div>
        </section>
        <section className="detail-information surface-raised">
          <div className="container detail-information__grid">
            <div>
              <SectionIntro eyebrow="A considered stay" title="Everything in its place" copy="Thoughtfully prepared for restful nights, slow mornings, and the freedom to make the space your own." />
              <div className="amenity-list">{amenityList.map((item) => <span key={item}><Check size={15} /> {item}</span>)}</div>
            </div>
            <div className="detail-booking-card bg-[var(--panel-raised)] border border-[var(--border-dark)] rounded-[var(--radius-md)] p-8">
              <div className="detail-booking-card__top"><span>Availability on request</span><span className="status-dot" /></div>
              <p className="detail-booking-card__copy">Send your dates and guest count — we'll confirm availability for {unit.name} by email.</p>
              <BookingTrigger unitId={unit.id} className="button button--gold detail-booking-card__cta">Request a booking <ArrowUpRight size={16} /></BookingTrigger>
            </div>
          </div>
        </section>
        <section className="detail-quote surface-base"><div className="container"><p>“</p><blockquote>Space to breathe, room to reconnect,<br />and a softer way to stay.</blockquote><span>— Le Grand Homestay</span></div></section>
      </main>
      <Footer manualReduce={manualReduce} setManualPreference={setManualPreference} />

      {lightbox && (
        <GalleryLightbox
          images={allGalleryImages}
          index={lightbox.index}
          opener={lightbox.opener}
          onIndexChange={(index) => setLightbox((current) => (current ? { ...current, index } : current))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function Footer({ manualReduce, setManualPreference }: { manualReduce: boolean; setManualPreference: (value: boolean) => void }) {
  return (
    <footer className="footer" id="contact">
      <div className="container footer__top">
        <div className="footer__brand">
          <Wordmark />
          <p>Your private escape in paradise.</p>
          <div className="footer__social">
            <a href="#contact" aria-label="Instagram"><Instagram size={17} /></a>
            <a href="#contact" aria-label="Facebook"><Facebook size={17} /></a>
          </div>
        </div>
        <div className="footer__column">
          <span>Explore</span>
          <a href="/#welcome">Welcome</a>
          <a href="/#units">The units</a>
          <a href="/#amenities">Amenities</a>
          <a href="/#gallery">Gallery</a>
        </div>
        <div className="footer__column">
          <span>Plan your stay</span>
          <BookingTrigger className="footer-link-button">Check availability</BookingTrigger>
          <BookingTrigger className="footer-link-button">Book now</BookingTrigger>
          <a href="/#location">Location</a>
          <a href="mailto:hello@legrande.example">Email us</a>
        </div>
        <div className="footer__column footer__column--contact">
          <span>Contact</span>
          <p>Arella Residences<br />Bay, Laguna</p>
          <p>Pan-Philippine Highway<br />Brgy. Calo, Laguna 4033</p>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} Le Grand Homestay. All rights reserved.</span>
        <label className="motion-toggle">
          <input type="checkbox" checked={manualReduce} onChange={(event) => setManualPreference(event.target.checked)} />
          <span>Reduce motion</span>
        </label>
        <span>Arella Residences · Bay, Laguna</span>
      </div>
    </footer>
  );
}
