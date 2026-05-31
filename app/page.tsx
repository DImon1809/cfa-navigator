import { Hero } from "@/components/sections/Hero";
import { CfaIntro } from "@/components/sections/CfaIntro";
import { PainCards } from "@/components/sections/PainCards";
import { CfaCards } from "@/components/sections/CfaCards";
import { LiveCfaFeed } from "@/components/sections/LiveCfaFeed";
import { QuickLeadForm } from "@/components/sections/QuickLeadForm";
import { SeoContent } from "@/components/sections/SeoContent";
import { Footer } from "@/components/sections/Footer";
import cfaData from "@/data/cfa.json";
import type { CfaCollection } from "@/lib/types";

const typedCfaData = cfaData as unknown as CfaCollection;

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <CfaIntro />
      <PainCards />
      <CfaCards items={typedCfaData.items} />
      <LiveCfaFeed />
      <QuickLeadForm />
      <SeoContent />
      <Footer />
    </main>
  );
}
