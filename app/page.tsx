import ApexEntryScreen from "@/components/ApexEntryScreen";
import Hero from "@/components/homepage/Hero";
import WindowNavigator from "@/components/homepage/WindowNavigator";
import WhyDifferent from "@/components/homepage/WhyDifferent";
import HomeVisitProcess from "@/components/homepage/HomeVisitProcess";
import GalleryShowcase from "@/components/homepage/GalleryShowcase";
import ApexInstallationJourney from "@/components/homepage/ApexInstallationJourney";
import SolutionFinder from "@/components/homepage/SolutionFinder";
import ReviewsPreview from "@/components/homepage/ReviewsPreview";
import GuidesPreview from "@/components/homepage/GuidesPreview";
import AreasPreview from "@/components/homepage/AreasPreview";
import ArloPreview from "@/components/homepage/ArloPreview";
import FinalCta from "@/components/homepage/FinalCta";
import ProfessionalsPreview from "@/components/homepage/ProfessionalsPreview";
import LazyFabricQuiz from "@/components/performance/LazyFabricQuiz";

export default function HomePage() {
  return (
    <>
      <ApexEntryScreen />
      <main className="min-h-screen bg-apex-navy-900 text-white">
        <Hero />
        <WhyDifferent />
        <ProfessionalsPreview />
        <WindowNavigator />
        <GalleryShowcase />
        <HomeVisitProcess />
        <ApexInstallationJourney />
        <ReviewsPreview />
        <ArloPreview />
        <GuidesPreview />
        <AreasPreview />
        <SolutionFinder />
        <LazyFabricQuiz />
        <FinalCta />
      </main>
    </>
  );
}
