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
  ShieldCheck,
} from "lucide-react";
export default function Home() {
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL;
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE;
  const contactAvailable = Boolean(email || phone);
  return (
    <>
      <header className="bg-white border-b border-stone-100">
        <nav
          aria-label="Main navigation"
          className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between gap-6"
        >
          <Link href="/" className="brand">
            HAMDI<span>TOURISM</span>
          </Link>
          <div className="hidden md:flex items-center gap-9 text-sm text-muted">
            <a href="#services">Our services</a>
            <a href="#journey">Your journey</a>
            <a href="#contact">Contact us</a>
          </div>
          <a className="button secondary" href="#contact">
            Arrange a transfer <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main>
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-14 lg:py-22 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow flex gap-2 items-center mb-6">
              <span className="w-7 h-px bg-brand" /> YOUR JOURNEY, TAKEN CARE OF
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.08] font-medium">
              A smooth arrival.
              <br />
              <span className="text-brand">A better journey.</span>
            </h1>
            <p className="mt-7 text-muted text-lg leading-relaxed max-w-md">
              Airport transfers and private chauffeur services across the UAE. From your arrival to
              your destination, let Hamdi Tourism take care of the drive.
            </p>
            <div className="flex flex-wrap gap-3 mt-9">
              <a href="#contact" className="button gold">
                Plan your journey <ArrowRight size={17} />
              </a>
              <a href="#services" className="button secondary">
                Explore our services
              </a>
            </div>
            <div className="flex flex-wrap gap-7 mt-10 pt-7 border-t border-stone-200 text-xs text-muted">
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
          <div
            className="hero-art rounded-[28px] min-h-[430px] sm:min-h-[510px] p-8 flex flex-col justify-between text-white"
            aria-label="Illustration of a chauffeur journey in the UAE"
          >
            <div className="flex justify-between items-center relative z-10">
              <span className="text-xs tracking-[.2em] text-white/60">HAMDI TOURISM</span>
              <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] tracking-widest">
                UAE
              </span>
            </div>
            <svg
              viewBox="0 0 600 330"
              className="w-full relative"
              role="img"
              aria-label="A car beside an abstract city skyline"
            >
              <defs>
                <linearGradient id="car" x2="0" y2="1">
                  <stop stopColor="#dfded1" />
                  <stop offset="1" stopColor="#a5b6a5" />
                </linearGradient>
              </defs>
              <g stroke="#79958a" fill="none" opacity=".45" strokeWidth="2">
                <path d="M40 230V138h38v92m18 0V85h38v145m30 0V125h42v105m27 0V76h36v154m20 0V25h16v205m0-205 8-22 8 22v205m22 0V110h53v120m20 0V143h35v87m22 0V98h51v132" />
                <path d="M0 231h600" />
              </g>
              <ellipse cx="300" cy="283" rx="240" ry="23" fill="#061f1d" />
              <path d="m80 232 64-21 61-61h165l81 57 66 18 15 44H68Z" fill="url(#car)" />
              <path d="m168 209 49-47h71v47Zm134 0v-47h57l63 47Z" fill="#23483f" />
              <path d="M79 236h66v10H76m400-10h35v10h-30" fill="#f0ddac" />
              <path d="M171 222h238m-133-6h22m39 0h22" stroke="#758f83" strokeWidth="3" />
              <circle cx="169" cy="267" r="32" fill="#0d2320" />
              <circle cx="169" cy="267" r="17" fill="#81958b" />
              <circle cx="440" cy="267" r="32" fill="#0d2320" />
              <circle cx="440" cy="267" r="17" fill="#81958b" />
              <path d="M70 276h460" stroke="#81958b" />
            </svg>
            <div className="relative z-10 flex justify-between items-end border-t border-white/15 pt-5">
              <div>
                <p className="text-white/50 text-xs mb-2">FROM ARRIVAL TO DESTINATION</p>
                <p className="text-2xl font-light">Travel at your own pace.</p>
              </div>
              <ArrowUpRight className="text-brand" size={30} />
            </div>
          </div>
        </section>
        <section id="services" className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex flex-wrap justify-between items-end gap-5 mb-10">
              <div>
                <p className="eyebrow mb-4">MADE FOR YOUR JOURNEY</p>
                <h2 className="text-3xl sm:text-4xl tracking-tight">
                  One destination. Many ways to get there.
                </h2>
              </div>
              <p className="text-muted max-w-xs text-sm leading-relaxed">
                Choose a service that fits your plans. Our team will help arrange the details.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Plane,
                  title: "Airport transfers",
                  text: "Arrange a pickup or drop-off for your flight, with your route and pickup details agreed in advance.",
                  tag: "ARRIVE WITH EASE",
                },
                {
                  icon: CarFront,
                  title: "Private chauffeur",
                  text: "A dedicated chauffeur for your planned journeys, appointments and time in the city.",
                  tag: "TRAVEL YOUR WAY",
                },
                {
                  icon: BriefcaseBusiness,
                  title: "Business travel",
                  text: "Coordinate transfers for colleagues, visitors and business appointments with our team.",
                  tag: "KEEP YOUR DAY MOVING",
                },
              ].map(({ icon: Icon, title, text, tag }) => (
                <article className="panel p-8 bg-canvas!" key={title}>
                  <Icon size={30} strokeWidth={1.4} className="text-brand mb-9" />
                  <p className="text-[10px] tracking-widest text-muted mb-3">{tag}</p>
                  <h3 className="text-xl font-semibold mb-4">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed mb-7">{text}</p>
                  <a href="#contact" className="flex items-center gap-3 text-sm font-semibold">
                    Enquire about this service <ArrowUpRight size={16} />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="journey"
          className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid md:grid-cols-2 gap-14"
        >
          <div>
            <p className="eyebrow mb-4">LESS TO THINK ABOUT</p>
            <h2 className="text-4xl tracking-tight mb-6">
              The details matter.
              <br />
              We help you plan them.
            </h2>
            <p className="text-muted leading-relaxed max-w-md">
              Tell us where you need to go, when you want to travel and who’s joining you. We’ll
              confirm the arrangements and agreed fare before your journey.
            </p>
          </div>
          <div className="space-y-7">
            {[
              {
                icon: MapPin,
                title: "Share your route",
                text: "Let us know your pickup, destination and flight details, if applicable.",
              },
              {
                icon: Users,
                title: "Choose the right fit",
                text: "Tell us your passenger and luggage requirements so we can arrange a suitable vehicle.",
              },
              {
                icon: Clock3,
                title: "Confirm your journey",
                text: "Our team will confirm availability, pickup instructions and pricing with you.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-5">
                <span className="w-12 h-12 shrink-0 rounded-xl bg-white border border-stone-200 flex items-center justify-center">
                  <Icon size={22} className="text-brand" />
                </span>
                <div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section id="contact" className="px-6 pb-20">
          <div className="max-w-7xl mx-auto bg-ink rounded-3xl p-9 sm:p-14 text-white flex flex-wrap gap-9 justify-between items-center">
            <div>
              <p className="eyebrow mb-4">LET’S PLAN YOUR NEXT JOURNEY</p>
              <h2 className="text-3xl sm:text-4xl tracking-tight mb-4">Where can we take you?</h2>
              <p className="text-white/65 max-w-lg leading-relaxed">
                Contact Hamdi Tourism with your travel date, route and passenger details to request
                availability and a quote.
              </p>
            </div>
            <div className="space-y-3">
              {email && (
                <a className="button gold w-full" href={`mailto:${email}`}>
                  Email our team <ArrowUpRight size={17} />
                </a>
              )}
              {phone && (
                <a className="button secondary w-full" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
                  {phone}
                </a>
              )}
              {!contactAvailable && (
                <p className="text-sm text-white/75 max-w-xs">
                  Online enquiries are currently unavailable. Please use your existing Hamdi Tourism
                  contact to arrange a journey.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-stone-200 py-9">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap gap-6 justify-between items-center">
          <Link href="/" className="brand text-lg">
            HAMDI<span>TOURISM</span>
          </Link>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Hamdi Tourism. All rights reserved.
          </p>
          <Link href="/login" className="text-xs text-muted flex gap-2 items-center">
            <ShieldCheck size={15} /> Staff sign in
          </Link>
        </div>
      </footer>
    </>
  );
}
