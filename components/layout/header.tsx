"use client";

import Link from "next/link";
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

export function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-background/90 px-3 shadow-sm shadow-navy-900/[0.03] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 sm:px-4 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Ouvrir le menu principal"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation principale</SheetTitle>
          <Sidebar
            className="w-full border-0"
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Changer le thème"
          title="Changer le thème"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 gap-2 px-1.5 outline-none hover:bg-glacier-100 focus-visible:ring-2 focus-visible:ring-ring sm:px-2"
              aria-label="Ouvrir le menu du compte"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-block">
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
                <User className="mr-2 h-4 w-4" />
                Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/parametres">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
