import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://kevinlabens-del.github.io/"),
  title: "CR3@TIX PONG",
  description: "CR3@TIX PONG : campagne Ascension, 12 arènes, boss, pouvoirs et duels Glace contre Feu.",
  applicationName: "CR3@TIX PONG",
  manifest: "/CR3-TIX-PONG/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CR3@TIX PONG",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/CR3-TIX-PONG/favicon.svg", type: "image/svg+xml" },
      { url: "/CR3-TIX-PONG/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/CR3-TIX-PONG/favicon.svg",
    apple: "/CR3-TIX-PONG/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/CR3-TIX-PONG/",
    title: "CR3@TIX PONG",
    description: "Campagne Ascension : 12 arènes, trois boss et un duel d’arcade Glace contre Feu.",
    images: [{ url: "/CR3-TIX-PONG/og.jpg", width: 1200, height: 630, alt: "CR3@TIX PONG — duel Glace contre Feu" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CR3@TIX PONG",
    description: "Campagne Ascension : conquiers les 12 arènes.",
    images: ["/CR3-TIX-PONG/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#060914",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
