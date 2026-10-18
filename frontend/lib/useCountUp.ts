import { useState, useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export function useCountUp(target: number, duration: number = 2000, startOnView: boolean = true) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [count, setCount] = useState(() => (prefersReducedMotion ? target : 0));
  const [isVisible, setIsVisible] = useState(!startOnView);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    if (!startOnView) {
      setIsVisible(true);
    } else if (elementRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimated) {
            setIsVisible(true);
            setHasAnimated(true);
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(elementRef.current);
      return () => observer.disconnect();
    }
  }, [startOnView, hasAnimated, prefersReducedMotion, target]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    if (!isVisible || hasAnimated) return;

    let startTime: number;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * target));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible, target, duration, hasAnimated, prefersReducedMotion]);

  return { count: prefersReducedMotion ? target : count, elementRef };
}