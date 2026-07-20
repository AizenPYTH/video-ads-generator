import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import {
  APP_DESCRIPTION,
  APP_NAME,
  BRAND_HERO_PATH,
  BRAND_LOGO_PATH,
} from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Annonces eBay intelligentes`,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: BRAND_LOGO_PATH,
    apple: BRAND_LOGO_PATH,
  },
  openGraph: {
    title: `${APP_NAME} — Annonces eBay intelligentes`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [{ url: BRAND_HERO_PATH, width: 1024, height: 576, alt: APP_NAME }],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Annonces eBay intelligentes`,
    description: APP_DESCRIPTION,
    images: [BRAND_HERO_PATH],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
