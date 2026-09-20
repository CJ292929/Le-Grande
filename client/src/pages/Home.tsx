import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  Droplets,
  Facebook,
  Instagram,
  Menu,
  Minus,
  MinusCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
  Wifi,
  X,
} from "lucide-react";

const images = {
  hero: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2400&q=90",
  welcome: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=85",
  unit1: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1400&q=85",
  unit2: "https://images.unsplash.com/photo-1582610116397-edb318620f90?auto=format&fit=crop&w=1400&q=85",
  unit3: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=85",
  unit4: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85",
  detail1: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=2000&q=90",
  detail2: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85",
  detail3: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85",
};

type Unit = {
  id: string;
  number: string;
  name: string;
  description: string;
  guests: string;
  beds: string;
  bath: string;
  size: string;
  image: string;
  availability: string;
};

export const units: Unit[] = [
  {
    id: "residence-i",
    number: "01",
    name: "Le Grande Residence I",
    description: "A composed retreat for slow mornings, soft light, and private time together.",
    guests: "2 guests",
    beds: "1 king bed",
    bath: "1 bath",
    size: "45 m²",
    image: images.unit1,
    availability: "Availability on request",
  },
  {
    id: "residence-ii",
    number: "02",
    name: "Le Grande Residence II",
    description: "An airy, generous space for families and friends to settle into the island rhythm.",
    guests: "4 guests",
    beds: "2 beds",
    bath: "1 bath",
    size: "58 m²",
    image: images.unit2,
    availability: "Availability on request",
  },
  {
    id: "residence-iii",
    number: "03",
    name: "Le Grande Residence III",
    description: "Warm timber, considered details, and an easy sense of room to breathe.",
    guests: "4 guests",
    beds: "2 beds",
    bath: "1 bath",
    size: "62 m²",
    image: images.unit3,
    availability: "Availability on request",
  },
  {
    id: "residence-iv",
    number: "04",
    name: "Le Grande Residence IV",
    description: "A refined home base for unhurried days, restful nights, and shared escapes.",
    guests: "3 guests",
    beds: "2 beds",
    bath: "1 bath",
    size: "52 m²",
    image: images.unit4,
    availability: "Availability on request",
  },
];

const navItems = [
  ["The units", "#units"],
  ["Amenities", "#amenities"],
  ["Gallery", "#gallery"],
  ["Location", "#location"],
  ["Contact", "#contact"],
];

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <a href="/" className={`wordmark ${dark ? "wordmark--dark" : ""}`} aria-label="Le Grande home">
      <span className="wordmark__mark">LG</span>
      <span className="wordmark__name">LE GRANDE</span>
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
  const [unit, setUnit] = useState(preselectedUnit);
  const [guests, setGuests] = useState("2 guests");

  useEffect(() => setUnit(preselectedUnit), [preselectedUnit]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    toast.success("Your enquiry is ready to send.", {
      description: "A Le Grande host will confirm dates and details with you shortly.",
    });
  };

  return (
    <form className="booking-bar" id="booking" onSubmit={submit}>
      <div className="booking-bar__intro">
        <span className="booking-bar__kicker">Begin your stay</span>
        <strong>Plan your escape</strong>
      </div>
      <label className="booking-field">
        <span><CalendarDays size={15} /> Check-in</span>
        <input type="date" aria-label="Check-in date" />
      </label>
      <label className="booking-field">
        <span><CalendarDays size={15} /> Check-out</span>
        <input type="date" aria-label="Check-out date" />
      </label>
      <label className="booking-field booking-field--select">
        <span><Users size={15} /> Guests</span>
        <select value={guests} onChange={(event) => setGuests(event.target.value)} aria-label="Number of guests">
          <option>2 guests</option>
          <option>3 guests</option>
          <option>4 guests</option>
          <option>5 guests</option>
        </select>
        <ChevronDown size={15} />
      </label>
      <label className="booking-field booking-field--select">
        <span><Sparkles size={15} /> Select unit</span>
        <select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Select unit">
          <option value="">Any residence</option>
          {units.map((item) => <option key={item.id} value={item.id}>Unit {item.number}</option>)}
        </select>
        <ChevronDown size={15} />
      </label>
      <button className="button button--gold booking-bar__submit" type="submit">
        Check availability <ArrowUpRight size={16} />
      </button>
    </form>
  );
}

function UnitCard({ unit }: { unit: Unit }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="unit-card">
      <div className="unit-card__media">
        <img src={unit.image} alt={`${unit.name} at Le Grande`} />
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
          <span className="unit-card__price">₱XXXX <small>/ night</small></span>
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
        <SectionIntro eyebrow="The Le Grande standard" title="Everything you need for a beautiful stay" copy="The essentials are considered, the atmosphere is unhurried, and the details are there when you need them." />
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

function Gallery() {
  return (
    <section className="gallery section-ivory" id="gallery">
      <div className="container">
        <div className="gallery__topline">
          <SectionIntro eyebrow="A sense of place" title="The gallery" />
          <p>Light, texture, and the little moments that make a stay feel like your own.</p>
        </div>
        <div className="gallery-grid">
          <figure className="gallery-tile gallery-tile--large"><img src={images.welcome} alt="Le Grande pool and tropical landscape" /><figcaption>THE PROPERTY <ArrowUpRight size={15} /></figcaption></figure>
          <figure className="gallery-tile"><img src={images.detail2} alt="Quiet bedroom interior" /><figcaption>THE UNITS <ArrowUpRight size={15} /></figcaption></figure>
          <figure className="gallery-tile"><img src={images.detail3} alt="Warmly lit residence interior" /><figcaption>THE DETAILS <ArrowUpRight size={15} /></figcaption></figure>
          <figure className="gallery-tile gallery-tile--wide"><img src={images.hero} alt="Le Grande resort-style exterior" /><figcaption>THE EXPERIENCE <ArrowUpRight size={15} /></figcaption></figure>
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
          <SectionIntro eyebrow="A softer kind of arrival" title="Your escape starts here" copy="We are preparing the final location details for Le Grande. Once confirmed, this is where you will find the address, directions, nearby places, and the easiest way to arrive." />
          <div className="placeholder-note"><Clock3 size={17} /><span>Exact location, nearby attractions, and travel times will be added when supplied.</span></div>
          <a className="text-link" href="#contact">Request directions <ArrowUpRight size={16} /></a>
        </div>
        <div className="map-placeholder">
          <div className="map-placeholder__grid" />
          <div className="map-placeholder__pin"><MinusCircle size={40} strokeWidth={1} /><span>LE GRANDE</span></div>
          <span className="map-placeholder__label">Location details coming soon</span>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero">
          <img className="hero__image" src={images.hero} alt="Tropical resort exterior at dusk" />
          <div className="hero__overlay" />
          <div className="hero__grain" />
          <div className="container hero__content">
            <p className="hero__eyebrow">Stay · relax · experience</p>
            <h1>Le Grande</h1>
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
              <SectionIntro eyebrow="Welcome to Le Grande" title="Where comfort meets the art of escape" copy="Discover a refined stay designed for guests who appreciate comfort, privacy, and effortless relaxation. Le Grande offers four thoughtfully prepared accommodation units, giving you a beautiful place to rest, reconnect, and enjoy your getaway." />
              <div className="welcome__signature"><span>LG</span><div><strong>Made for moments</strong><small>Your private escape in paradise</small></div></div>
              <a className="text-link" href="#units">Discover the residences <ArrowUpRight size={16} /></a>
            </div>
            <div className="welcome__media"><img src={images.welcome} alt="Tropical pool and garden at Le Grande" /><span className="image-caption">The art of doing less</span></div>
          </div>
        </section>

        <section className="units section-teal" id="units">
          <div className="container">
            <div className="units__header"><SectionIntro eyebrow="Our accommodations" title="Choose your perfect stay" light /><span className="units__count">04<br /><small>residences</small></span></div>
            <div className="unit-grid">{units.map((unit) => <UnitCard unit={unit} key={unit.id} />)}</div>
          </div>
        </section>

        <Amenities />
        <Gallery />
        <Location />

        <section className="cta section-teal">
          <div className="cta__halo" />
          <div className="container cta__content">
            <p className="eyebrow eyebrow--gold"><span />Le Grande</p>
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
  const [activeImage, setActiveImage] = useState(unit.image);
  const [guestCount, setGuestCount] = useState(2);

  useEffect(() => setActiveImage(unit.image), [unit.image]);

  const amenityList = ["Wi-Fi", "Air conditioning", "Private bathroom", "TV", "Refrigerator", "Hot shower", "Linens", "Towels", "Hair dryer"];
  const galleryImages = [unit.image, images.detail2, images.detail3];

  return (
    <div className="site-shell detail-page">
      <Header />
      <main>
        <section className="detail-hero section-ivory">
          <div className="container"><Link className="back-link" href="/#units"><ArrowLeft size={15} /> Back to residences</Link><div className="detail-hero__grid"><div className="detail-gallery"><div className="detail-gallery__main"><img src={activeImage} alt={unit.name} /></div><div className="detail-gallery__thumbs">{galleryImages.map((image, index) => <button type="button" key={image} className={activeImage === image ? "is-active" : ""} onClick={() => setActiveImage(image)}><img src={image} alt={`${unit.name} view ${index + 1}`} /></button>)}</div></div><div className="detail-copy"><p className="eyebrow"><span />Unit {unit.number}</p><h1>{unit.name}</h1><p className="detail-copy__lead">{unit.description} A private, considered base for the days you want to remember.</p><div className="detail-stats"><span><Users size={16} /> {unit.guests}</span><span><BedDouble size={16} /> {unit.beds}</span><span><Droplets size={16} /> {unit.bath}</span><span><span className="size-icon">m²</span> {unit.size}</span></div><div className="detail-price"><span>Starting from</span><strong>₱XXXX <small>/ night</small></strong></div><a className="button button--dark" href="#detail-booking">Book this unit <ArrowUpRight size={16} /></a></div></div></div>
        </section>
        <section className="detail-information section-light"><div className="container detail-information__grid"><div><SectionIntro eyebrow="A considered stay" title="Everything in its place" copy="Thoughtfully prepared for restful nights, slow mornings, and the freedom to make the space your own." /><div className="amenity-list">{amenityList.map((item) => <span key={item}><Check size={15} /> {item}</span>)}</div></div><div className="detail-booking-card" id="detail-booking"><div className="detail-booking-card__top"><span>Availability on request</span><span className="status-dot" /></div><h3>Plan your stay</h3><p>Choose your dates and we will confirm availability with a host.</p><label>Check-in<input type="date" /></label><label>Check-out<input type="date" /></label><div className="guest-stepper"><span>Guests</span><div><button type="button" onClick={() => setGuestCount(Math.max(1, guestCount - 1))} aria-label="Remove guest"><Minus size={15} /></button><strong>{guestCount}</strong><button type="button" onClick={() => setGuestCount(Math.min(8, guestCount + 1))} aria-label="Add guest"><Plus size={15} /></button></div></div><button className="button button--gold" type="button" onClick={() => toast.success("Enquiry started", { description: `We will check Unit ${unit.number} for your dates.` })}>Check availability <ArrowUpRight size={16} /></button><small className="detail-booking-card__note">No payment is required to enquire.</small></div></div></section>
        <section className="detail-quote section-teal"><div className="container"><p>“</p><blockquote>Space to breathe, room to reconnect,<br />and a softer way to stay.</blockquote><span>— Le Grande</span></div></section>
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container footer__top"><div className="footer__brand"><Wordmark /><p>Your private escape in paradise.</p><div className="footer__social"><a href="#contact" aria-label="Instagram"><Instagram size={17} /></a><a href="#contact" aria-label="Facebook"><Facebook size={17} /></a></div></div><div className="footer__column"><span>Explore</span><a href="/#welcome">Welcome</a><a href="/#units">The units</a><a href="/#amenities">Amenities</a><a href="/#gallery">Gallery</a></div><div className="footer__column"><span>Plan your stay</span><a href="/#booking">Check availability</a><a href="/#booking">Book now</a><a href="/#location">Location</a><a href="mailto:hello@legrande.example">Email us</a></div><div className="footer__column footer__column--contact"><span>Contact</span><p>Phone details<br />coming soon</p><p>Address details<br />coming soon</p></div></div><div className="container footer__bottom"><span>© {new Date().getFullYear()} Le Grande. All rights reserved.</span><span>Designed for the art of escape.</span></div>
    </footer>
  );
}
