import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, ShieldCheck, Clock3, Radio } from "lucide-react";
import { homeCopy, type HomeLanguage } from "@/lib/home-language";
function RouteGlow({ mini = false }: { mini?: boolean }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      aria-hidden="true"
      className={mini ? "preview-route" : "cinematic-route"}
      preserveAspectRatio="none"
    >
      <path
        className="route-halo"
        d="M560 900 C190 795 285 717 510 662 S760 613 620 575 S664 550 798 526"
      />
      <path
        className="route-line"
        d="M560 900 C190 795 285 717 510 662 S760 613 620 575 S664 550 798 526"
      />
      <circle cx="510" cy="662" r="9" />
      <circle cx="798" cy="526" r="7" />
    </svg>
  );
}
export function CinematicHero({ language }: { language: HomeLanguage }) {
  const copy = homeCopy[language];
  return (
    <section className="cinematic-hero" aria-label="Dubai sunset marketing showcase">
      <picture className="cinematic-backdrop">
        <img
          src="/marketing/dubai-cinematic-hero.webp"
          width={1672}
          height={941}
          alt="Original marketing visualization of a black luxury sedan on a Dubai highway at sunset, with Burj Khalifa in the background"
          fetchPriority="high"
        />
      </picture>
      <div className="cinematic-shade" />
      <RouteGlow />
      <div
        className="cinematic-copy"
        lang={language}
        dir={language === "ar" || language === "ur" ? "rtl" : "ltr"}
      >
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 aria-label={`${copy.first} ${copy.second}`}>
          {copy.first}
          <span>{copy.second}</span>
        </h1>
        <p className="cinematic-description">{copy.description}</p>
        <div className="flex flex-wrap gap-5 items-center mt-8">
          <Link className="button gold" href="/book">
            {copy.book}
            <ArrowRight size={18} />
          </Link>
          <Link href="#services" className="service-preview-link">
            <span>
              <ArrowUpRight size={17} />
            </span>
            {copy.services}
          </Link>
        </div>
      </div>
      <div className="cinematic-route-label">
        <MapPin size={16} /> UAE journeys <span>Visual preview</span>
      </div>
      <aside className="cinematic-navigation" aria-label="Journey visual preview">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Your next journey</p>
          <span className="preview-badge">Visual preview</span>
        </div>
        <div className="navigation-map-preview">
          <RouteGlow mini />
          <span>
            <MapPin size={16} /> Your route
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div>
            <dt>Pickup</dt>
            <dd>Choose when booking</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>Choose when booking</dd>
          </div>
        </dl>
        <div className="navigation-features">
          <Link href="/track">
            <Radio size={17} />
            <span>Live Tracking</span>
            <ArrowRight size={14} />
          </Link>
          <p>
            <ShieldCheck size={17} /> Safe &amp; Reliable
          </p>
          <p>
            <Clock3 size={17} /> On-Time Service
          </p>
        </div>
        <p className="text-[10px] text-white/65 mt-4">
          No active trip shown. Decorative route; no live distance or ETA.
        </p>
      </aside>
      <p className="cinematic-disclosure">
        Original marketing visualization · not company inventory or verified GPS
      </p>
    </section>
  );
}
