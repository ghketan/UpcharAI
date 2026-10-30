import React, { useEffect, useRef, useState } from 'react';

export interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom-in' | 'fade';
  delay?: number;
  duration?: number;
  threshold?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  threshold = 0.12,
  className = '',
  style = {},
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(el);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const animationClass =
    animation === 'fade-left'
      ? 'reveal-left'
      : animation === 'fade-right'
      ? 'reveal-right'
      : animation === 'zoom-in'
      ? 'reveal-zoom'
      : animation === 'fade'
      ? 'reveal-fade'
      : 'reveal-base';

  return (
    <div
      ref={ref}
      className={`${animationClass} ${isRevealed ? 'revealed' : ''} ${className}`}
      style={{
        ...style,
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

export const ScrollProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const pct = Math.min(100, Math.max(0, (window.scrollY / scrollHeight) * 100));
        setProgress(pct);
      }
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[60] bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-[#2a6a48] via-[#4de082] to-[#2a6a48] transition-all duration-75 ease-out shadow-[0_0_8px_rgba(42,106,72,0.7)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ScrollReveal;
