"use client";

import * as React from "react";
import { Dialog, VisuallyHidden } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import type { MatchCardData } from "@/components/matches/types";
import type { ProfileDetail } from "@/lib/profile";
import { displayName } from "@/lib/utils";
import { ProfileView } from "./profile-view";
import type { CarouselHandle } from "./photo-carousel";

interface OverlayContextValue {
  open: (card: MatchCardData) => void;
  /** Lists subscribe to keep cards in sync with changes made inside the overlay. */
  subscribe: (listener: OverlayListener) => () => void;
}

export type OverlayEvent = { type: "removed"; id: string } | { type: "saved"; id: string; saved: boolean };
type OverlayListener = (event: OverlayEvent) => void;

const OverlayContext = React.createContext<OverlayContextValue | null>(null);

export function useProfileOverlay() {
  return React.useContext(OverlayContext);
}

/**
 * Opens a profile on top of whatever list you're browsing, without a route
 * change: the URL becomes /profile/[id] (shareable, refresh-safe), the card's
 * photo and name morph into place via shared layoutIds, and Back closes it.
 */
export function ProfileOverlayProvider({ children }: { children: React.ReactNode }) {
  const [card, setCard] = React.useState<MatchCardData | null>(null);
  const [detail, setDetail] = React.useState<ProfileDetail | null | undefined>(undefined);
  const listeners = React.useRef(new Set<OverlayListener>());
  const pushedRef = React.useRef(false);
  const returnUrl = React.useRef<string | null>(null);
  const carousel = React.useRef<CarouselHandle>(null);

  const emit = React.useCallback((event: OverlayEvent) => {
    listeners.current.forEach((listener) => listener(event));
  }, []);

  const subscribe = React.useCallback((listener: OverlayListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const open = React.useCallback((next: MatchCardData) => {
    setDetail(undefined);
    setCard(next);
    returnUrl.current = window.location.pathname + window.location.search;
    window.history.pushState({ ...window.history.state, rumiProfile: next.id }, "", `/profile/${next.id}`);
    pushedRef.current = true;
  }, []);

  const close = React.useCallback(() => {
    carousel.current?.reset();
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
    setCard(null);
  }, []);

  // Browser/Android back closes the overlay.
  React.useEffect(() => {
    const onPop = () => {
      if (!card) return;
      pushedRef.current = false;
      carousel.current?.reset();
      setCard(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [card]);

  // Fetch the full profile while the morph is playing.
  React.useEffect(() => {
    if (!card) return;
    const controller = new AbortController();
    fetch(`/api/profiles/${card.id}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) return setDetail(null);
        if (!res.ok) throw new Error(String(res.status));
        setDetail((await res.json()) as ProfileDetail);
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setDetail(null);
      });
    return () => controller.abort();
  }, [card]);

  const value = React.useMemo(() => ({ open, subscribe }), [open, subscribe]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <Dialog.Root open={Boolean(card)} onOpenChange={(isOpen) => !isOpen && close()}>
        <AnimatePresence>
          {card ? (
            <Dialog.Portal forceMount key={card.id}>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-scrim max-md:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <div className="pointer-events-none fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-6">
                <Dialog.Content
                  asChild
                  forceMount
                  aria-describedby={undefined}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="pointer-events-auto relative h-dvh w-full overflow-y-auto overscroll-contain outline-none md:h-auto md:max-h-[calc(100dvh-48px)] md:max-w-[980px] md:overflow-hidden md:rounded-xl">
                    {/* The panel surface fades on its own layer so the morphing photo stays fully opaque. */}
                    <motion.div
                      aria-hidden
                      className="absolute inset-0 bg-bg md:rounded-xl md:bg-surface md:shadow-lg md:ring-1 md:ring-line"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.05 } }}
                      transition={{ duration: 0.2 }}
                    />
                    <VisuallyHidden.Root>
                      <Dialog.Title>{displayName(card.firstName, card.lastInitial)}&apos;s profile</Dialog.Title>
                    </VisuallyHidden.Root>
                    <ProfileView
                      id={card.id}
                      preview={card}
                      detail={detail}
                      mode="overlay"
                      onClose={close}
                      carouselRef={carousel}
                      onRemoved={(id) => emit({ type: "removed", id })}
                      onSavedChange={(id, saved) => emit({ type: "saved", id, saved })}
                    />
                  </div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </OverlayContext.Provider>
  );
}

