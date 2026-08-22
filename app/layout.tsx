import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL("https://kevinlabens-del.github.io/"),
  title: "CR3@TIX PONG V3",
  description: "CR3@TIX PONG V3 : combat arcade élémentaire, 12 arènes, boss multi-phases, 13 power-ups et modes Survival, Chaos, Boss Rush et Hardcore.",
  applicationName: "CR3@TIX PONG V3",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CR3@TIX PONG V3",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `${basePath}/favicon.svg`,
    apple: `${basePath}/icons/icon-192.png`,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: basePath ? `${basePath}/` : "/",
    title: "CR3@TIX PONG V3",
    description: "Le combat arcade Glace contre Feu évolue : techniques, boss multi-phases, progression et modes V3.",
    images: [{ url: `${basePath}/og.jpg`, width: 1200, height: 630, alt: "CR3@TIX PONG V3 — combat arcade Glace contre Feu" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CR3@TIX PONG V3",
    description: "Treize power-ups, quatre nouveaux modes et trois boss multi-phases.",
    images: [`${basePath}/og.jpg`],
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
