"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Moon, Settings, Sun, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { useTheme } from "@/components/providers";
import { signOut } from "@/features/auth/actions";

interface HeaderProps {
  user?: {
    email?: string;
    fullName?: string;
  };
}

const titles: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/dashboard/annonces": "Mes annonces",
  "/dashboard/creer": "Créer une annonce",
  "/dashboard/imports": "Imports",
  "/dashboard/produits": "Produits",
  "/dashboard/ebay": "Compte eBay",
  "/dashboard/abonnement": "Abonnement",
  "/dashboard/parametres": "Paramètres",
};

function resolveTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  const match = Object.keys(titles)
    .filter((k) => k !== "/dashboard" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? titles[match] : "Smart Seller";
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = resolveTitle(pathname);
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "U");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--ss-border)]/80 bg-[var(--ss-surface)]/85 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--ss-surface)]/75 sm:px-6 lg:px-8">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Ouvrir le menu principal"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[15.5rem] border-0 p-0">
          <SheetTitle className="sr-only">Navigation principale</SheetTitle>
          <Sidebar
            className="w-full"
            userLabel={user?.fullName || user?.email}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ss-text)] md:text-[15px]">
          {pageTitle}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Changer le thème"
          title="Changer le thème"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 gap-2 px-1.5 outline-none sm:px-2"
              aria-label="Ouvrir le menu du compte"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-[var(--ss-glacier-100)] text-xs text-[var(--ss-navy-800)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium md:inline-block">
                {user?.fullName ?? user?.email?.split("@")[0] ?? "Compte"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {user?.fullName && (
                  <p className="text-sm font-medium leading-none">
                    {user.fullName}
                  </p>
                )}
                {user?.email && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/parametres">
                <User className="mr-2 size-4" />
                Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/parametres">
                <Settings className="mr-2 size-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 size-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
