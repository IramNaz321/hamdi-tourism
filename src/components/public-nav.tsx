"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const links = [
  ["Home", "/"],
  ["Airport Transfers", "/#transfers"],
  ["Our Fleet", "/#fleet"],
  ["Destinations", "/#destinations"],
  ["About Us", "/#about"],
  ["Contact Us", "/#contact"],
];
export function PublicNav({ name, logo }: { name: string; logo?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-white border-b border-stone-100">
      <nav
        aria-label="Main navigation"
        className="max-w-[1440px] mx-auto px-5 lg:px-8 py-5 flex items-center justify-between gap-6"
      >
        <Link
          href="/"
          aria-label={`${name} home`}
          className="brand max-w-[210px] sm:max-w-none text-[20px]! sm:text-[25px]!"
        >
          {logo ? (
            <picture>
              <img src={logo} alt={name} className="max-h-14 w-auto max-w-48" />
            </picture>
          ) : (
            <>
              {name.toUpperCase()}
              <span className="tracking-[.16em]! text-[8px]!">
                AIRPORT TRANSFERS & CHAUFFEUR SERVICES
              </span>
            </>
          )}
        </Link>
        <div className="hidden xl:flex gap-6 text-xs text-muted">
          {links.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <Link href="/login" className="hidden lg:flex items-center gap-2 text-xs font-semibold">
          Staff Sign In <ArrowUpRight size={14} />
        </Link>
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
              {[...links, ["Staff Sign In", "/login"]].map(([label, href]) => (
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
