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
  { href: "/dashboard/creer", label: "Créer une annonce", icon: PlusCircle },
  { href: "/dashboard/annonces", label: "Mes annonces", icon: ShoppingBag },
  { href: "/dashboard/produits", label: "Produits analysés", icon: Package },
  { href: "/dashboard/imports", label: "Imports", icon: FileUp },
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
    return pathname === "/dashboard/creer" || pathname.startsWith("/dashboard/creer/");
  }
  return pathname.startsWith(`${href}/`) || pathname === href;
}

type SidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col border-r border-white/10 bg-navy-900 text-white shadow-xl shadow-navy-900/10",
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-white/10 px-3">
        <div
          className="flex w-full items-center rounded-lg bg-white px-2 py-1.5 outline-none transition-colors hover:bg-white/95 focus-within:ring-2 focus-within:ring-glacier-300 focus-within:ring-offset-2 focus-within:ring-offset-navy-900"
          onClick={onNavigate}
        >
          <BrandLogo href="/dashboard" height={28} />
        </div>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 space-y-1 overflow-y-auto p-3">
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
                "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium outline-none transition-[color,background-color,border-color,box-shadow]",
                isActive
                  ? "border-glacier-300/30 bg-glacier-300/15 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/7 hover:text-white",
                "focus-visible:border-glacier-300 focus-visible:ring-2 focus-visible:ring-glacier-300/70",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-glacier-300" : "text-white/55 group-hover:text-glacier-300",
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-3 text-[11px] font-medium tracking-wide text-white/40">
        Gestion de vos annonces eBay
      </div>
    </aside>
  );
}
