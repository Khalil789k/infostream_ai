import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import { Space_Grotesk as FontHeadline } from "next/font/google";
import { Source_Code_Pro as FontCode } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// layout.tsx — Root layout for the App Router
// This file loads global CSS, registers fonts, and wraps all pages.
// Comments added so you know where to plug global pieces (fonts, themes).
// ---------------------------------------------------------------------------

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontHeadline = FontHeadline({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["500", "700"],
});

const fontCode = FontCode({
  subsets: ["latin"],
  variable: "--font-code",
});

// Metadata — Configure logo.svg as the browser tab favicon.
export const metadata: Metadata = {
  title: "Info Stream AI",
  description: "AI-powered study assistant",
  icons: {
    icon: "/logo_circular.svg",
    apple: "/logo_circular.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The html/body wrapper is required by Next App Router pages
    <html lang="en" suppressHydrationWarning>
      {/* Explicitly serve scalable vector logo_circular.svg as the browser tab favicon */}
      <head>
        <link rel="icon" href="/logo_circular.svg" type="image/svg+xml" />
      </head>
      <body
        className={cn(
          // Base classes applied globally - Light theme only
          "min-h-screen bg-white font-sans antialiased",
          // Font variables injected by next/font to use in Tailwind variables
          fontSans.variable,
          fontHeadline.variable,
          fontCode.variable
        )}
      >
        {/* children is where route content renders (page.tsx etc.) */}
        {children}
      </body>
    </html>
  );
}
