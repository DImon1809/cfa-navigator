import { Hero } from "@/components/sections/Hero";
import { CfaIntro } from "@/components/sections/CfaIntro";
import { PainCards } from "@/components/sections/PainCards";
import { CfaCards } from "@/components/sections/CfaCards";
import { QuickLeadForm } from "@/components/sections/QuickLeadForm";
import { SeoContent } from "@/components/sections/SeoContent";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <CfaIntro />
      <PainCards />
      <CfaCards />
      <QuickLeadForm />
      <SeoContent />
      <Footer />
    </main>
  );
}
