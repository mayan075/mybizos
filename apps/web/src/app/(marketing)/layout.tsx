import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import { FloatingVoiceReminder } from "@/components/landing/floating-voice-reminder";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <FloatingVoiceReminder />
    </>
  );
}
