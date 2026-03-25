import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = localFont({
  src: [
    {
      path: "../fonts/inter-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/inter-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/inter-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/inter-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
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
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
