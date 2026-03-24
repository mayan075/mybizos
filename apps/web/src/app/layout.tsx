import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "MyBizOS — AI-Powered Business OS for Local Services",
    template: "%s | MyBizOS",
  },
  description:
    "AI-native business operating system for local service businesses. Never miss a lead — AI answers every call, qualifies prospects, and books appointments 24/7.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "MyBizOS",
    title: "MyBizOS — AI-Powered Business OS for Local Services",
    description:
      "Never miss a lead. AI answers every call, qualifies prospects, and books appointments 24/7. Built for HVAC, plumbing, removals, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyBizOS — AI-Powered Business OS for Local Services",
    description:
      "Never miss a lead. AI answers every call, qualifies prospects, and books appointments 24/7.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
