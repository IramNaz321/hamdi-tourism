import { TravelConcierge } from "@/components/travel-concierge";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Plane,
  CarFront,
  BriefcaseBusiness,
  MapPin,
  Clock3,
  Users,
  Luggage,
  Mail,
  Phone,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { websiteContent, enquiriesConfigured } from "@/lib/website";
import { PublicNav } from "@/components/public-nav";
import { TransferEnquiry } from "@/components/transfer-enquiry";
import { JourneyArt } from "@/components/journey-art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { settings, locations, fleet, logo_url } = await websiteContent();
  const name = settings?.display_name ?? "Hamdi Tourism";
  const destinations = locations.filter((l) => l.featured_destination);
  const hero = destinations.find((l) => l.image_url);
  const theme = settings
    ? ({
        "--brand": settings.brand_color,
        "--ink": settings.ink_color,
        "--canvas": settings.canvas_color,
        fontFamily:
          settings.font_family === "serif" ? "Georgia, serif" : "Arial, Helvetica, sans-serif",
      } as CSSProperties)
    : undefined;
  return (
    <div style={theme}>
      {settings && (
        <style>{`:root { --brand: ${settings.brand_color}; --ink: ${settings.ink_color}; --canvas: ${settings.canvas_color}; }`}</style>
      )}
      <TravelConcierge />
      <PublicNav name={name} logo={logo_url} />
      <main>
        <section className="relative bg-ink text-white min-h-[570px] lg:min-h-[640px] overflow-hidden">
          {hero?.image_url ? (
            <picture>
              <img
                src={hero.image_url}
                alt={hero.name}
                className="absolute inset-0 size-full object-cover"
              />
            </picture>
          ) : (
            <JourneyArt />
          )}
          <div className="absolute inset-0 pointer-events-none bg-linear-to-r from-ink via-ink/85 to-ink/10" />
          <div className="hero-copy max-w-7xl mx-auto px-6 lg:px-10 py-22 lg:py-28 relative z-10">
            <p className="eyebrow text-white/75! mb-6">
              UAE AIRPORT TRANSFERS & CHAUFFEUR SERVICES
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[1.08] tracking-tight max-w-2xl font-medium">
              Your Journey,
              <br />
              <span className="hero-highlight">Our Priority</span>
            </h1>
            <p className="text-white/75 text-lg leading-relaxed max-w-lg mt-7">
              Arrive, explore and travel at your own pace. Arrange your UAE airport transfer or
              private chauffeur journey with {name}.
            </p>
            <div className="flex flex-wrap gap-3 mt-9">
              <Button asChild variant="gold">
                <a href="/book">
                  Book Your Transfer <ArrowRight />
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="#fleet">
                  Explore Our Fleet <ArrowUpRight />
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 mt-10 text-xs text-white/70">
              <span className="flex gap-2 items-center">
                <Plane size={16} /> Airport transfers
              </span>
              <span className="flex gap-2 items-center">
                <CarFront size={16} /> Private chauffeurs
              </span>
              <span className="flex gap-2 items-center">
                <MapPin size={16} /> United Arab Emirates
              </span>
            </div>
          </div>
        </section>
        <section
          id="transfers"
          className="max-w-7xl mx-auto px-5 lg:px-10 relative z-20 -mt-10 pb-20"
        >
          <TransferEnquiry
            locations={locations}
            enabled={!!settings?.enquiries_enabled && locations.length >= 2}
            canSubmit={enquiriesConfigured()}
          />
        </section>
        <section id="services" className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="eyebrow mb-4">OUR SERVICES</p>
            <div className="flex flex-wrap justify-between gap-6 mb-10">
              <h2 className="text-3xl sm:text-4xl tracking-tight max-w-xl">
                A service for every journey.
              </h2>
              <p className="text-muted text-sm max-w-xs leading-relaxed">
                Share your plans with our team. We’ll help coordinate the route, vehicle and pickup
                arrangements.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Plane,
                  title: "Airport Transfers",
                  text: "Plan your arrival or departure with a pickup and destination agreed in advance.",
                  tag: "FROM ARRIVAL TO DESTINATION",
                },
                {
                  icon: CarFront,
                  title: "Private Chauffeur Services",
                  text: "Arrange a chauffeur for your appointments, city visits and private travel plans.",
                  tag: "YOUR DAY, YOUR PACE",
                },
                {
                  icon: BriefcaseBusiness,
                  title: "Business Travel",
                  text: "Coordinate transfers for colleagues, visitors and business appointments.",
                  tag: "KEEP YOUR PLANS CONNECTED",
                },
              ].map(({ icon: Icon, title, text, tag }) => (
                <Card className="p-8 bg-canvas!" key={title}>
                  <Icon className="text-brand mb-9" size={32} strokeWidth={1.4} />
                  <p className="text-[10px] tracking-widest text-muted mb-3">{tag}</p>
                  <h3 className="font-semibold text-xl mb-4">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed mb-7">{text}</p>
                  <a className="text-sm font-semibold flex gap-2 items-center" href="#transfers">
                    Plan this journey <ArrowUpRight size={16} />
                  </a>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section id="fleet" className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <p className="eyebrow mb-4">OUR FLEET</p>
          <h2 className="text-4xl tracking-tight">The right vehicle for your plans.</h2>
          <p className="text-muted mt-5 max-w-xl">
            Review our published vehicles and share your passenger and luggage requirements. Our
            team will confirm a suitable assignment.
          </p>
          {fleet.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {fleet.map((vehicle) => (
                <Card key={vehicle.id} className="overflow-hidden">
                  {vehicle.image_url ? (
                    <picture>
                      <img
                        src={vehicle.image_url}
                        alt={vehicle.name}
                        className="w-full h-64 object-cover"
                      />
                    </picture>
                  ) : (
                    <div className="h-52 flex items-center justify-center bg-stone-100">
                      <CarFront size={54} strokeWidth={1} className="text-muted" />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="eyebrow mb-3 capitalize">{vehicle.category}</p>
                    <h3 className="text-xl font-semibold">{vehicle.name}</h3>
                    {vehicle.description && (
                      <p className="text-sm text-muted leading-relaxed mt-3">
                        {vehicle.description}
                      </p>
                    )}
                    <div className="flex gap-5 mt-5 text-xs text-muted">
                      <span className="flex gap-2 items-center">
                        <Users size={15} />
                        {vehicle.capacity} seats
                      </span>
                      <span className="flex gap-2 items-center">
                        <Luggage size={15} />
                        {vehicle.luggage_capacity} luggage
                      </span>
                    </div>
                    <a href="#transfers" className="text-sm font-semibold flex gap-2 mt-6">
                      Enquire about a transfer <ArrowUpRight size={16} />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-10 mt-10 text-center">
              <CarFront size={40} className="mx-auto text-brand mb-5" />
              <h3 className="font-semibold text-lg">Let’s find the right fit.</h3>
              <p className="text-muted text-sm mt-3">
                Published fleet details are currently unavailable. Contact our team with your
                passenger and luggage requirements.
              </p>
            </Card>
          )}
        </section>
        <section id="destinations" className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="eyebrow mb-4">POPULAR UAE DESTINATIONS</p>
            <h2 className="text-4xl tracking-tight">Where will your journey take you?</h2>
            {destinations.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                {destinations.map((destination) => (
                  <Card key={destination.id} className="overflow-hidden">
                    {destination.image_url ? (
                      <picture>
                        <img
                          src={destination.image_url}
                          alt={destination.name}
                          className="h-72 w-full object-cover"
                        />
                      </picture>
                    ) : (
                      <div className="h-48 bg-canvas flex items-center justify-center">
                        <MapPin size={40} strokeWidth={1.2} className="text-brand" />
                      </div>
                    )}
                    <div className="p-6">
                      <p className="text-xs text-muted mb-2">{destination.city}</p>
                      <h3 className="font-semibold text-xl">{destination.name}</h3>
                      {destination.description && (
                        <p className="text-sm text-muted mt-3 leading-relaxed">
                          {destination.description}
                        </p>
                      )}
                      <a href="#transfers" className="text-sm font-semibold flex gap-2 mt-6">
                        Plan a transfer <ArrowUpRight size={16} />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="notice mt-8">
                Contact our team to discuss the destinations available for your journey.
              </p>
            )}
          </div>
        </section>
        <section
          id="about"
          className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid md:grid-cols-2 gap-14"
        >
          <div>
            <p className="eyebrow mb-4">ABOUT {name.toUpperCase()}</p>
            <h2 className="text-4xl tracking-tight mb-6">
              Travel with your plans
              <br />
              at the heart of the journey.
            </h2>
            <p className="text-muted leading-relaxed whitespace-pre-wrap">
              {settings?.about_text ??
                `${name} provides airport transfer and chauffeur services in the United Arab Emirates. Tell us where you need to go, when you want to travel and who’s joining you.`}
            </p>
          </div>
          <div>
            <p className="eyebrow mb-7">WHY CHOOSE {name.toUpperCase()}</p>
            <div className="space-y-7">
              {[
                {
                  icon: MapPin,
                  title: "Your route, agreed in advance",
                  text: "Share your pickup and destination so our team can coordinate the journey.",
                },
                {
                  icon: Users,
                  title: "A vehicle suited to your group",
                  text: "Let us know passenger and luggage needs before confirming arrangements.",
                },
                {
                  icon: Clock3,
                  title: "Clear journey details",
                  text: "Review your pickup instructions and agreed fare with our team.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-5">
                  <span className="size-12 shrink-0 rounded-xl bg-white border border-stone-200 flex items-center justify-center">
                    <Icon className="text-brand" size={22} />
                  </span>
                  <div>
                    <h3 className="font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="contact" className="px-6 pb-20">
          <div className="max-w-7xl mx-auto bg-ink text-white rounded-3xl p-8 sm:p-14 grid md:grid-cols-2 gap-9">
            <div>
              <p className="eyebrow mb-4 text-white/75!">CONTACT US</p>
              <h2 className="text-4xl tracking-tight mb-5">Let’s plan your next journey.</h2>
              <p className="text-white/70 leading-relaxed">
                Contact {name} with your travel date, route and passenger details to request
                availability.
              </p>
            </div>
            <address className="not-italic space-y-4">
              {settings?.contact_email && (
                <a className="flex items-center gap-3" href={`mailto:${settings.contact_email}`}>
                  <Mail size={18} />
                  {settings.contact_email}
                </a>
              )}
              {settings?.phone && (
                <a
                  className="flex items-center gap-3"
                  href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}
                >
                  <Phone size={18} />
                  {settings.phone}
                </a>
              )}
              {settings?.whatsapp && (
                <a
                  className="flex items-center gap-3"
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={18} />
                  Contact us on WhatsApp
                </a>
              )}
              {settings?.address && (
                <p className="flex gap-3">
                  <MapPin size={18} className="shrink-0" />
                  {settings.address}
                </p>
              )}
              {!settings?.contact_email && !settings?.phone && !settings?.whatsapp && (
                <p className="text-sm text-white/70">
                  Online contact information is currently unavailable. Please use your existing{" "}
                  {name} contact to arrange a journey.
                </p>
              )}
            </address>
          </div>
        </section>
        {(settings?.booking_policy || settings?.cancellation_policy) && (
          <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-20 grid md:grid-cols-2 gap-8">
            {settings.booking_policy && (
              <div>
                <h2 className="font-semibold mb-3">Booking policy</h2>
                <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                  {settings.booking_policy}
                </p>
              </div>
            )}
            {settings.cancellation_policy && (
              <div>
                <h2 className="font-semibold mb-3">Cancellation policy</h2>
                <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                  {settings.cancellation_policy}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="border-t border-stone-200 py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap gap-6 justify-between items-center">
          <div>
            <p className="font-semibold tracking-wider">{name.toUpperCase()}</p>
            <p className="text-xs text-muted mt-2">Airport Transfers & Chauffeur Services</p>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <Link className="text-xs text-muted flex gap-2" href="/login">
            <ShieldCheck size={15} />
            Staff Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
