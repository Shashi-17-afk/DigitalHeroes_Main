import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

/**
 * Geist is mapped to --font-sans via shadcn's @theme block in globals.css.
 * next/font/google handles self-hosting, preloading, and eliminates FOUT.
 */
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Digital Heroes — Golf, Give, Win",
    template: "%s | Digital Heroes",
  },
  description:
    "Subscribe, track your golf scores, support a charity you love, and win monthly prizes. Digital Heroes combines performance tracking with charitable giving.",
  keywords: ["golf", "charity", "prize draw", "subscription", "stableford"],
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Digital Heroes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
