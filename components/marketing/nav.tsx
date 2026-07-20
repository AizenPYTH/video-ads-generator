"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/brand";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLogo href="/" height={34} priority />

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label="Navigation principale"
        >
          <Link
            href="/#fonctionnalites"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Fonctionnalités
          </Link>
          <Link
            href="/#tarifs"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Connexion
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">Créer un compte</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,88vw)]">
              <SheetHeader className="border-b pb-5 text-left">
                <SheetTitle>
                  <BrandLogo href={null} height={32} />
                  <span className="sr-only">{APP_NAME}</span>
                </SheetTitle>
              </SheetHeader>
              <nav
                className="mt-6 flex flex-col gap-2"
                aria-label="Navigation mobile"
              >
                {[
                  { href: "/#fonctionnalites", label: "Fonctionnalités" },
                  { href: "/#tarifs", label: "Tarifs" },
                  { href: "/login", label: "Connexion" },
                ].map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-lg px-3 py-3 text-base font-medium hover:bg-accent"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Button asChild className="mt-4 w-full">
                    <Link href="/signup">Créer un compte</Link>
                  </Button>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
