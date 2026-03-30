"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightning } from "@phosphor-icons/react";

export function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="relative bg-[#060614]">
      {/* Gradient line at top */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-5 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20">
                <Lightning className="h-4 w-4" weight="fill" />
              </div>
              <span className="text-lg font-bold text-white">HararAI</span>
            </Link>
            <p className="mt-3 text-sm text-white/25">
              The AI-powered operating system for local service businesses.
            </p>

            <div className="mt-5 flex gap-3">
              {[
                { label: "Twitter", path: "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" },
                { label: "LinkedIn", path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
                { label: "Facebook", path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/25 transition-colors hover:bg-sky-500/15 hover:text-sky-400"
                  aria-label={social.label}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white/70">Product</h4>
            <ul className="mt-4 space-y-3">
              {[
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Demo", href: "/dashboard" },
                { label: "AI Phone Agent", href: "#how-ai-works" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/25 transition-colors hover:text-white/50">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white/70">Company</h4>
            <ul className="mt-4 space-y-3">
              {["About", "Blog", "Careers", "Partners"].map((label) => (
                <li key={label}>
                  <a href="#" className="text-sm text-white/25 transition-colors hover:text-white/50">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white/70">Support</h4>
            <ul className="mt-4 space-y-3">
              {[
                { label: "Help Center", href: "#" },
                { label: "Contact", href: "mailto:support@hararai.com" },
                { label: "Status", href: "#" },
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/25 transition-colors hover:text-white/50">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-14 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-white/85">
                Get growth tips for service businesses
              </h4>
              <p className="mt-1 text-sm text-white/25">
                Weekly insights on AI, marketing, and running a better business. No spam.
              </p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="flex w-full gap-2 sm:w-auto">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/15 sm:w-64"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/[0.04] pt-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-white/20">
              Built for local businesses by people who understand local businesses.
            </p>
            <p className="text-xs text-white/10">
              &copy; 2026 HararAI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
