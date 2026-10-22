"use client";
import { BrandLogo } from "./brand-logo";
import { homeCopy, type HomeLanguage } from "@/lib/home-language";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function PublicNav({
  name,
  logo,
  language = "en",
}: {
  name: string;
  logo?: string;
  language?: HomeLanguage;
}) {
  const router = useRouter();
  const copy = homeCopy[language];
  const destinations = ["/", "/#transfers", "/#fleet", "/track", "/#about", "/#contact"];
  const links = copy.links.map((label, index) => [label, destinations[index]]);
  const [open, setOpen] = useState(false);
  return (
    <header className="premium-header">
      <nav
        aria-label="Main navigation"
        className="max-w-[1440px] mx-auto px-5 lg:px-8 py-5 flex items-center justify-between gap-6"
      >
        <BrandLogo name={name} imageUrl={logo} />
        <div className="hidden xl:flex gap-6 text-xs text-muted">
          {links.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <select
            aria-label="Website language"
            className="header-language"
            value={language}
            onChange={(event) => router.push(`/?lang=${event.target.value}`)}
          >
            <option value="en">EN</option>
            <option value="ar">العربية</option>
            <option value="ur">اردو</option>
            <option value="hi">हिन्दी</option>
          </select>
          <Link href="/login" className="header-login hidden sm:flex">
            {copy.login}
          </Link>
          <Link href="/book" className="header-book hidden sm:flex">
            {copy.bookNow}
          </Link>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="xl:hidden"
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle className="text-xl font-semibold">{name}</DialogTitle>
            <DialogDescription className="text-sm text-muted mt-2">
              Airport Transfers & Chauffeur Services
            </DialogDescription>
            <div className="flex flex-col mt-6 gap-1">
              {[...links, [copy.login, "/login"], [copy.bookNow, "/book"]].map(([label, href]) => (
                <Link
                  onClick={() => setOpen(false)}
                  key={label}
                  href={href}
                  className="rounded-lg py-3 px-2 hover:bg-canvas text-sm"
                >
                  {label}
                </Link>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </nav>
    </header>
  );
}
