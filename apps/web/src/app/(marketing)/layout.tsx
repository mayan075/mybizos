import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import { FloatingVoiceReminder } from "@/components/landing/floating-voice-reminder";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScrollProvider>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <FloatingVoiceReminder />
    </SmoothScrollProvider>
  );
}
