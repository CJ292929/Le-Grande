import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { units, type Unit } from "@shared/units";
import { cardSrcSet, coverFor, mediaFor, MediaImage, PLACEHOLDER_IMAGE, STATIC_MEDIA, variantUrl, VARIANT_SIZE, type PublicMedia } from "@/lib/media";
import BookingForm from "@/components/BookingForm";
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
  MinusCircle,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
  Wifi,
  X,
} from "lucide-react";

const navItems = [
  ["The units", "#units"],
  ["Amenities", "#amenities"],
  ["Gallery", "#gallery"],
  ["Location", "#location"],
  ["Contact", "#contact"],
];

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <a href="/" className={`wordmark ${dark ? "wordmark--dark" : ""}`} aria-label="Le Grand Homestay home">
      <span className="wordmark__mark">LG</span>
      <span className="wordmark__name">LE GRAND HOMESTAY</span>
    </a>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
      <div className="container site-header__inner">
        <Wordmark dark={scrolled} />
        <nav className={`desktop-nav ${open ? "desktop-nav--open" : ""}`} aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <a className="nav-action nav-action--outline" href="#booking" onClick={() => setOpen(false)}>
            Check availability
          </a>
          <a className="nav-action nav-action--gold" href="#booking" onClick={() => setOpen(false)}>
            Book now <ArrowUpRight size={15} />
          </a>
        </nav>
        <button className="mobile-menu" type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}

function SectionIntro({ eyebrow, title, copy, light = false }: { eyebrow: string; title: string; copy?: string; light?: boolean }) {
  return (
    <div className={`section-intro ${light ? "section-intro--light" : ""}`}>
      <p className="eyebrow"><span />{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p className="section-intro__copy">{copy}</p>}
    </div>
  );
}

function BookingBar({ preselectedUnit = "" }: { preselectedUnit?: string }) {
  return (
    <BookingForm
      id="booking"
      variant="bar"
      idPrefix="home-booking"
      defaultUnitId={preselectedUnit || undefined}
    />
  );
}

function UnitCard({ unit, media }: { unit: Unit; media: PublicMedia[] }) {
  const [saved, setSaved] = useState(false);
  const cover = coverFor(media, "unit", unit.id);
  return (
    <article className="unit-card">
      <div className="unit-card__media">
        <MediaImage
          src={cover ? variantUrl(cover.imageUrl, "card") : PLACEHOLDER_IMAGE}
          srcSet={cover ? cardSrcSet(cover.imageUrl) : undefined}
          sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw"
          width={VARIANT_SIZE.card.width}
          height={VARIANT_SIZE.card.height}
          loading="lazy"
          alt={cover?.imageAlt || `${unit.name} at Le Grand Homestay`}
        />
        <div className="unit-card__veil" />
        <span className="unit-card__number">UNIT {unit.number}</span>
        <button className={`save-button ${saved ? "save-button--saved" : ""}`} type="button" aria-label="Save unit" onClick={() => setSaved(!saved)}>
          <Sparkles size={16} />
        </button>
        <span className="availability-pill"><span /> {unit.availability}</span>
      </div>
      <div className="unit-card__body">
        <div className="unit-card__heading">
          <h3>{unit.name}</h3>
          <span className="unit-card__price">Contact us for rates</span>
        </div>
        <p>{unit.description}</p>
        <div className="unit-card__facts">
          <span><Users size={15} /> {unit.guests}</span>
          <span><BedDouble size={15} /> {unit.beds}</span>
          <span><Droplets size={15} /> {unit.bath}</span>
          <span><span className="size-icon">m²</span> {unit.size}</span>
        </div>
        <div className="unit-card__footer">
          <Link className="text-link" href={`/unit/${unit.id}`}>View unit <ArrowUpRight size={16} /></Link>
          <a className="button button--small button--dark" href="#booking">Book now</a>
        </div>
      </div>
    </article>
  );
}

function Amenities() {
  const items = [
    ["01", "Comfort", "Air conditioning, private bathroom, hot shower", <Waves size={24} />],
    ["02", "Convenience", "Wi-Fi, refrigerator, fresh linens and towels", <Wifi size={24} />],
    ["03", "Essentials", "Hair dryer and everyday details, thoughtfully prepared", <ShieldCheck size={24} />],
    ["04", "Stay your way", "A calm, private setting for couples, families, and friends", <Coffee size={24} />],
  ];
  return (
    <section className="amenities section-light" id="amenities">
      <div className="container">
        <SectionIntro eyebrow="The Le Grand Homestay standard" title="Everything you need for a beautiful stay" copy="The essentials are considered, the atmosphere is unhurried, and the details are there when you need them." />
        <div className="amenity-grid">
          {items.map(([number, title, copy, icon]) => (
            <div className="amenity-item" key={String(number)}>
              <span className="amenity-item__number">{number}</span>
              <div className="amenity-item__icon">{icon}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryTile({ item, className, caption }: { item?: PublicMedia; className: string; caption: string }) {
  return (
    <figure className={className}>
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
    </figure>
  );
}

function Gallery({ media }: { media: PublicMedia[] }) {
  const gallery = mediaFor(media, "property-gallery");
  return (
    <section className="gallery section-ivory" id="gallery">
      <div className="container">
        <div className="gallery__topline">
          <SectionIntro eyebrow="A sense of place" title="The gallery" />
          <p>A look inside each of our four residences — real rooms, real light.</p>
        </div>
        <div className="gallery-grid">
          <GalleryTile item={gallery[0]} className="gallery-tile gallery-tile--large" caption="RESIDENCE I" />
          <GalleryTile item={gallery[1]} className="gallery-tile" caption="RESIDENCE II" />
          <GalleryTile item={gallery[2]} className="gallery-tile" caption="RESIDENCE III" />
          <GalleryTile item={gallery[3]} className="gallery-tile gallery-tile--wide" caption="RESIDENCE IV" />
        </div>
      </div>
    </section>
  );
}

function Location() {
  return (
    <section className="location section-light" id="location">
      <div className="container location__grid">
        <div className="location__copy">
          <SectionIntro eyebrow="A softer kind of arrival" title="Your escape starts here" copy="Find Le Grand Homestay at Arella Residences, a calm and convenient base in Bay, Laguna. Save the address below for an easier arrival." />
          <div className="placeholder-note"><MapPin size={17} /><span>Arella Residences, Pan-Philippine Highway, Brgy. Calo, Bay, Laguna 4033, Philippines</span></div>
          <a className="text-link" href="https://www.google.com/maps/search/?api=1&query=Arella%20Residences%2C%20Pan-Philippine%20Highway%2C%20Brgy.%20Calo%2C%20Bay%2C%20Laguna%204033%2C%20Philippines" target="_blank" rel="noreferrer">Request directions <ArrowUpRight size={16} /></a>
        </div>
        <div className="map-placeholder">
          <div className="map-placeholder__grid" />
          <div className="map-placeholder__pin"><MinusCircle size={40} strokeWidth={1} /><span>LE GRAND HOMESTAY</span></div>
          <span className="map-placeholder__label">Arella Residences · Bay, Laguna</span>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const media = STATIC_MEDIA;
  const hero = coverFor(media, "hero");
  const welcome = coverFor(media, "property-gallery") || hero;
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero">
          <MediaImage
            className="hero__image"
            src={hero ? variantUrl(hero.imageUrl, "full") : PLACEHOLDER_IMAGE}
            width={VARIANT_SIZE.full.width}
            height={VARIANT_SIZE.full.height}
            fetchPriority="high"
            alt={hero?.imageAlt || "Le Grand Homestay residence interior"}
          />
          <div className="hero__overlay" />
          <div className="hero__grain" />
          <div className="container hero__content">
            <p className="hero__eyebrow">Stay · relax · experience</p>
            <h1>Le Grand Homestay</h1>
            <div className="hero__rule" />
            <p className="hero__tagline">Your private escape<br />in paradise.</p>
            <p className="hero__copy">An elegant stay designed for comfort, relaxation, and unforgettable moments.</p>
            <div className="hero__actions">
              <a className="button button--gold" href="#units">Explore our units <ArrowDownRight size={16} /></a>
              <a className="button button--ghost" href="#booking">Check availability <ArrowUpRight size={16} /></a>
            </div>
          </div>
          <div className="hero__scroll"><span /> Scroll to discover</div>
          <div className="hero__side-label">A private collection of four residences</div>
        </section>

        <div className="booking-wrap container"><BookingBar /></div>

        <section className="welcome section-ivory" id="welcome">
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

        <section className="units section-teal" id="units">
          <div className="container">
            <div className="units__header"><SectionIntro eyebrow="Our accommodations" title="Choose your perfect stay" light /><span className="units__count">04<br /><small>residences</small></span></div>
            <div className="unit-grid">{units.map((unit) => <UnitCard unit={unit} media={media} key={unit.id} />)}</div>
          </div>
        </section>

        <Amenities />
        <Gallery media={media} />
        <Location />

        <section className="cta section-teal">
          <div className="cta__halo" />
          <div className="container cta__content">
            <p className="eyebrow eyebrow--gold"><span />Le Grand Homestay</p>
            <h2>Make your next escape<br /><em>extraordinary.</em></h2>
            <p>Four beautiful spaces. One unforgettable destination.</p>
            <a className="button button--gold" href="#booking">Book your stay <ArrowUpRight size={16} /></a>
          </div>
        </section>
      </main>
      <Footer />
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

  return (
    <div className="site-shell detail-page">
      <Header />
      <main>
        <section className="detail-hero section-ivory">
          <div className="container"><Link className="back-link" href="/#units"><ArrowLeft size={15} /> Back to residences</Link><div className="detail-hero__grid"><div className="detail-gallery"><div className="detail-gallery__main"><MediaImage src={activeImageSrc} alt={unit.name} width={VARIANT_SIZE.full.width} height={VARIANT_SIZE.full.height} /></div><div className="detail-gallery__thumbs">{galleryImages.map((image, index) => <button type="button" key={image.id} className={activeImage === image.imageUrl ? "is-active" : ""} onClick={() => setActiveImage(image.imageUrl)}><MediaImage src={variantUrl(image.imageUrl, "thumb")} width={VARIANT_SIZE.thumb.width} height={VARIANT_SIZE.thumb.height} alt={image.imageAlt || `${unit.name} view ${index + 1}`} loading={index === 0 ? undefined : "lazy"} /></button>)}</div>{remainingPhotoCount > 0 && !showAllPhotos && <button type="button" className="text-link detail-gallery__view-all" onClick={() => setShowAllPhotos(true)}>View all {allGalleryImages.length} photos <ArrowUpRight size={16} /></button>}</div><div className="detail-copy"><p className="eyebrow"><span />Unit {unit.number}</p><h1>{unit.name}</h1><p className="detail-copy__lead">{unit.description} A private, considered base for the days you want to remember.</p><div className="detail-stats"><span><Users size={16} /> {unit.guests}</span><span><BedDouble size={16} /> {unit.beds}</span><span><Droplets size={16} /> {unit.bath}</span><span><span className="size-icon">m²</span> {unit.size}</span></div><div className="detail-price"><span>Rates</span><strong>Contact us for rates</strong></div><a className="button button--dark" href="#detail-booking">Book this unit <ArrowUpRight size={16} /></a></div></div></div>
        </section>
        <section className="detail-information section-light"><div className="container detail-information__grid"><div><SectionIntro eyebrow="A considered stay" title="Everything in its place" copy="Thoughtfully prepared for restful nights, slow mornings, and the freedom to make the space your own." /><div className="amenity-list">{amenityList.map((item) => <span key={item}><Check size={15} /> {item}</span>)}</div></div><div className="detail-booking-card"><div className="detail-booking-card__top"><span>Availability on request</span><span className="status-dot" /></div><BookingForm id="detail-booking" variant="card" idPrefix={`unit-${unit.id}`} defaultUnitId={unit.id} /></div></div></section>
        <section className="detail-quote section-teal"><div className="container"><p>“</p><blockquote>Space to breathe, room to reconnect,<br />and a softer way to stay.</blockquote><span>— Le Grand Homestay</span></div></section>
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container footer__top"><div className="footer__brand"><Wordmark /><p>Your private escape in paradise.</p><div className="footer__social"><a href="#contact" aria-label="Instagram"><Instagram size={17} /></a><a href="#contact" aria-label="Facebook"><Facebook size={17} /></a></div></div><div className="footer__column"><span>Explore</span><a href="/#welcome">Welcome</a><a href="/#units">The units</a><a href="/#amenities">Amenities</a><a href="/#gallery">Gallery</a></div><div className="footer__column"><span>Plan your stay</span><a href="/#booking">Check availability</a><a href="/#booking">Book now</a><a href="/#location">Location</a><a href="mailto:hello@legrande.example">Email us</a></div><div className="footer__column footer__column--contact"><span>Contact</span><p>Arella Residences<br />Bay, Laguna</p><p>Pan-Philippine Highway<br />Brgy. Calo, Laguna 4033</p></div></div><div className="container footer__bottom"><span>© {new Date().getFullYear()} Le Grand Homestay. All rights reserved.</span><span>Arella Residences · Bay, Laguna</span></div>
    </footer>
  );
}
