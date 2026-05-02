'use client';

import { useEffect, useRef } from 'react';

const MOBILE_MQ = '(max-width: 768px)';

/**
 * Horizontal carousel: in-view fade/slide for cards, centered "active" card,
 * and image parallax via `--parallax-x` on `.home-attr-img`. Desktop no-op.
 */
export function useScrollDrivenCarousel<T extends HTMLElement>(itemsKey: string) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mq = window.matchMedia(MOBILE_MQ);
    let inViewObserver: IntersectionObserver | null = null;
    let rafId: number | null = null;

    function updateActive() {
      const root = containerRef.current;
      if (!root) return;

      const cards = Array.from(root.querySelectorAll<HTMLElement>('.home-attr-card'));
      if (cards.length === 0) return;

      const containerRect = root.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestCard: HTMLElement | null = null;
      let closestDistance = Infinity;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - containerCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestCard = card;
        }

        const img = card.querySelector<HTMLImageElement>('.home-attr-img');
        if (img && containerRect.width > 0) {
          const normalizedOffset = (cardCenter - containerCenter) / containerRect.width;
          const parallaxX = normalizedOffset * -20;
          img.style.setProperty('--parallax-x', `${parallaxX}px`);
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

    function scheduleUpdate() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateActive();
      });
    }

    function clearCardEnhancements() {
      const root = containerRef.current;
      if (!root) return;
      const cards = Array.from(root.querySelectorAll<HTMLElement>('.home-attr-card'));
      cards.forEach((card) => {
        card.removeAttribute('data-active');
        const img = card.querySelector<HTMLImageElement>('.home-attr-img');
        img?.style.removeProperty('--parallax-x');
      });
    }

    function mountMobile() {
      const root = containerRef.current;
      if (!root) return;

      const cards = Array.from(root.querySelectorAll<HTMLElement>('.home-attr-card'));
      if (cards.length === 0) return;

      inViewObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.setAttribute('data-in-view', 'true');
            }
          });
        },
        {
          root: root,
          rootMargin: '0px',
          threshold: 0.2,
        }
      );

      cards.forEach((card) => inViewObserver!.observe(card));

      root.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate);
      scheduleUpdate();
    }

    function unmountMobile() {
      inViewObserver?.disconnect();
      inViewObserver = null;
      const scrollRoot = containerRef.current;
      if (scrollRoot) {
        scrollRoot.removeEventListener('scroll', scheduleUpdate);
      }
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      clearCardEnhancements();
    }

    function applyForMq() {
      unmountMobile();
      if (mq.matches) {
        mountMobile();
      }
    }

    applyForMq();

    mq.addEventListener('change', applyForMq);

    return () => {
      mq.removeEventListener('change', applyForMq);
      unmountMobile();
    };
  }, [itemsKey]);

  return containerRef;
}
