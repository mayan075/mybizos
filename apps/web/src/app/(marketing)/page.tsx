import { Hero } from "./components/hero";
import { ProblemSection } from "./components/problem-section";
import { HowItWorks } from "./components/how-it-works";
import { FeaturesSection } from "./components/features-section";
import { IndustryShowcase } from "./components/industry-showcase";
import { ROICalculator } from "./components/roi-calculator";
import { Testimonials } from "./components/testimonials";
import { ComparisonTable } from "./components/comparison-table";
import { PricingSection } from "./components/pricing-section";
import { FAQSection } from "./components/faq-section";
import { FinalCTA } from "./components/final-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
      <IndustryShowcase />
      <ROICalculator />
      <Testimonials />
      <ComparisonTable />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
