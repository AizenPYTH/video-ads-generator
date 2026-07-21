"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FileUp,
  LayoutDashboard,
  Package,
  PlusCircle,
  Settings,
  ShoppingBag,
  Store,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/annonces", label: "Mes annonces", icon: ShoppingBag },
  { href: "/dashboard/creer", label: "Créer une annonce", icon: PlusCircle },
  { href: "/dashboard/imports", label: "Imports", icon: FileUp },
  { href: "/dashboard/produits", label: "Produits", icon: Package },
  { href: "/dashboard/ebay", label: "Compte eBay", icon: Store },
  { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (href === "/dashboard/annonces") {
    return (
      pathname === "/dashboard/annonces" ||
      (pathname.startsWith("/dashboard/annonces/") &&
        !pathname.startsWith("/dashboard/creer"))
    );
  }
  if (href === "/dashboard/creer") {
    return (
      pathname === "/dashboard/creer" || pathname.startsWith("/dashboard/creer/")
    );
  }
  return pathname.startsWith(`${href}/`) || pathname === href;
}

type SidebarProps = {
  onNavigate?: () => void;
  className?: string;
  userLabel?: string;
};

export function Sidebar({ onNavigate, className, userLabel }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col bg-[var(--ss-navy-950)] text-white",
        className,
      )}
    >
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <div
          className="flex w-full items-center rounded-lg bg-white px-2.5 py-2 transition-colors duration-200 hover:bg-white/95"
          onClick={onNavigate}
        >
          <BrandLogo href="/dashboard" height={26} />
        </div>
      </div>

      <nav
        aria-label="Navigation principale"
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4"
      >
        {navItems.map((item) => {
          const isActive = isNavActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              {isActive && (
                <span
                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--ss-glacier-400)]"
                  aria-hidden
                />
              )}
              <Icon
                className={cn(
                  "size-[18px] shrink-0 transition-colors duration-200",
                  isActive
                    ? "text-[var(--ss-glacier-300)]"
                    : "text-white/55 group-hover:text-white/80",
                )}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-xs font-medium text-white/50">
          {userLabel ?? "Compte Smart Seller"}
        </p>
        <p className="mt-0.5 text-[11px] text-white/35">Espace vendeur</p>
      </div>
    </aside>
  );
}
