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
import { HydrateOnView } from "@/components/ui/hydrate-on-view";

export default function LandingPage() {
  return (
    <>
      <SmoothScroll />
      <DeletedNotice />
      <SiteNav />
      <main id="main">
        <Hero />
        {/* Below the fold: server HTML now, interactivity as each section approaches. */}
        {/* Its static first frame matches the client render, so it can wait until it's nearly on screen. */}
        <HydrateOnView margin="150px">
          <RankStory />
        </HydrateOnView>
        <HydrateOnView className="render-on-view">
          <WhyYouMatch />
        </HydrateOnView>
        <HydrateOnView className="render-on-view">
          <GetStarted />
        </HydrateOnView>
        <HydrateOnView className="render-on-view">
          <Features />
        </HydrateOnView>
        <div className="render-on-view">
          <Safety />
        </div>
        <HydrateOnView className="render-on-view">
          <Faq />
        </HydrateOnView>
        <HydrateOnView className="render-on-view">
          <FinalCta />
        </HydrateOnView>
      </main>
      <div className="render-on-view">
        <SiteFooter />
      </div>
    </>
  );
}
