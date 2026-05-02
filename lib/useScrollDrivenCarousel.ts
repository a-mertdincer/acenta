'use client';

import { useEffect, useRef } from 'react';

const MOBILE_MQ = '(max-width: 768px)';

/**
 * Mobile vertical reels: active card (vertical center), Ken Burns via CSS,
 * data-scrolled hides scroll hint after first scroll. Desktop: no-op.
 */
export function useScrollDrivenCarousel<T extends HTMLElement>(itemsKey: string) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mq = window.matchMedia(MOBILE_MQ);
    let rafId: number | null = null;
    let hasScrolled = false;

    function scheduleUpdate() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateActive();
      });
    }

    function updateActive() {
      const container = containerRef.current;
      if (!container) return;

      const cards = Array.from(container.querySelectorAll<HTMLElement>('.home-attr-card'));
      if (cards.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenterY = containerRect.top + containerRect.height / 2;

      let closestCard: HTMLElement | null = null;
      let closestDistance = Infinity;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenterY = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenterY - containerCenterY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestCard = card;
        }
      });

      cards.forEach((card) => {
        if (card === closestCard) {
          card.setAttribute('data-active', 'true');
        } else {
          card.removeAttribute('data-active');
        }
      });
    }

    function onScroll() {
      if (!hasScrolled) {
        hasScrolled = true;
        const el = containerRef.current;
        if (el) el.setAttribute('data-scrolled', 'true');
      }
      scheduleUpdate();
    }

    function teardownMobile() {
      const scrollRoot = containerRef.current;
      if (scrollRoot) {
        scrollRoot.removeEventListener('scroll', onScroll);
        scrollRoot.removeAttribute('data-scrolled');
        scrollRoot.querySelectorAll('.home-attr-card').forEach((node) => {
          (node as HTMLElement).removeAttribute('data-active');
        });
      }
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      hasScrolled = false;
    }

    function mountMobile() {
      const root = containerRef.current;
      if (!root) return;

      hasScrolled = false;
      root.removeAttribute('data-scrolled');

      root.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', scheduleUpdate);
      scheduleUpdate();
    }

    function applyForMq() {
      teardownMobile();
      if (mq.matches) {
        mountMobile();
      }
    }

    applyForMq();

    mq.addEventListener('change', applyForMq);

    return () => {
      mq.removeEventListener('change', applyForMq);
      teardownMobile();
    };
  }, [itemsKey]);

  return containerRef;
}
