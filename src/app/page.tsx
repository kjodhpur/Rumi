import { SiteNav } from "@/components/marketing/site-nav";
import { Hero } from "@/components/marketing/hero";
import { RankStory } from "@/components/marketing/rank-story";
import { WhyYouMatch } from "@/components/marketing/why-you-match";
import { GetStarted } from "@/components/marketing/get-started";
import { Features } from "@/components/marketing/features";
import { Safety } from "@/components/marketing/safety";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { DeletedNotice } from "@/components/marketing/deleted-notice";

export default function LandingPage() {
  return (
    <>
      <SmoothScroll />
      <DeletedNotice />
      <SiteNav />
      <main id="main">
        <Hero />
        <RankStory />
        <WhyYouMatch />
        <GetStarted />
        <Features />
        <Safety />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
