"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { cn } from "@/lib/utils";
import { springSheet } from "@/lib/motion";
import { imagePlaceholder } from "@/lib/photos";

export interface CarouselPhoto {
  id: string;
  url: string;
  placeholder: string | null;
}

export interface CarouselHandle {
  reset: () => void;
}

/**
 * Native scroll-snap carousel (60fps swipe for free) inside a frame that owns
 * the shared `layoutId`, so the whole frame morphs from the match card.
 */
export const PhotoCarousel = React.forwardRef<
  CarouselHandle,
  {
    id: string;
    name: string;
    photos: CarouselPhoto[];
    className?: string;
    rounded?: number;
    sizes?: string;
    priority?: boolean;
  }
>(function PhotoCarousel({ id, name, photos, className, rounded = 0, sizes = "100vw", priority }, ref) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);

  React.useImperativeHandle(ref, () => ({
    reset: () => scroller.current?.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior }),
  }));

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };

  const go = (delta: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: (index + delta) * el.clientWidth, behavior: "smooth" });
  };

  return (
    <motion.div
      layoutId={`photo-${id}`}
      transition={springSheet}
      style={{ borderRadius: rounded }}
      className={cn("group/carousel relative aspect-[4/5] overflow-hidden bg-surface-sunken", className)}
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        className="scrollbar-none flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        aria-roledescription="carousel"
        aria-label={`${name}'s photos`}
      >
        {photos.length === 0 ? (
          <Monogram name={name} seed={id} rounded="rounded-none" className="size-full shrink-0 [container-type:size]" />
        ) : (
          photos.map((photo, i) => (
            <div
              key={photo.id}
              className="relative size-full shrink-0 snap-center snap-always"
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${i + 1} of ${photos.length}`}
            >
              <Image
                src={photo.url}
                alt={i === 0 ? `${name}'s main photo` : `${name}, photo ${i + 1}`}
                fill
                priority={priority && i === 0}
                sizes={sizes}
                className="object-cover"
                placeholder={imagePlaceholder(photo.placeholder)}
                draggable={false}
              />
            </div>
          ))
        )}
      </div>

      {photos.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
            {photos.map((photo, i) => (
              <span
                key={photo.id}
                className={cn(
                  "size-1.5 rounded-full bg-white transition-[transform,opacity] duration-200",
                  i === index ? "scale-[1.35] opacity-100" : "opacity-55",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute top-1/2 left-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition-opacity group-hover/carousel:opacity-100 disabled:hidden md:flex md:opacity-0"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= photos.length - 1}
            aria-label="Next photo"
            className="absolute top-1/2 right-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition-opacity group-hover/carousel:opacity-100 disabled:hidden md:flex md:opacity-0"
          >
            <ChevronRight className="size-5" strokeWidth={2} />
          </button>
        </>
      ) : null}
    </motion.div>
  );
});
