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

// Metadata — include empty icons to prevent Next from emitting a favicon.

// Ensure no favicon is emitted. Next will otherwise try to include /favicon.ico
// or other static icons. Setting `icons.icon` to an empty array prevents Next
// from adding a favicon to the generated <head> so the browser tab won't show
// a site icon (note: browsers may still show a cached icon until you hard
// refresh / clear cache).
export const metadata: Metadata = {
  title: "Info Stream AI",
  description: "AI-powered study assistant",
  icons: {
    // empty array intentionally removes any icon entries
    icon: [],
    apple: [],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The html/body wrapper is required by Next App Router pages
    <html lang="en" suppressHydrationWarning>
      {/* Explicit blank favicon to override any injected favicon (data: URL is an empty image) */}
      <head>
        <link rel="icon" href="data:," />
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
