import { useEffect, useRef, useMemo, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './ScrollReveal.css';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement> | null;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
}

const ScrollReveal = ({
  children,
  scrollContainerRef = null,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom bottom'
}: ScrollRevealProps) => {
  const containerRef = useRef<HTMLHeadingElement>(null);

  const splitText = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="word" key={index}>
          {word}
        </span>
      );
    });
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      console.log('ScrollReveal: Element not found');
      return;
    }

    console.log('ScrollReveal: Initializing animations for:', children);
    
    const scroller = scrollContainerRef && scrollContainerRef.current ? scrollContainerRef.current : window;

    // Container rotation animation
    gsap.fromTo(
      el,
      { 
        transformOrigin: '0% 50%', 
        rotate: baseRotation,
        opacity: 0.3
      },
      {
        ease: 'none',
        rotate: 0,
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: 'top 80%',
          end: 'bottom 20%',
          scrub: 1,
          markers: false, // Set to true for debugging
          onEnter: () => console.log('ScrollReveal: Animation triggered'),
          onLeave: () => console.log('ScrollReveal: Animation left')
        }
      }
    );

    const wordElements = el.querySelectorAll('.word');
    console.log('ScrollReveal: Found word elements:', wordElements.length);

    // Word opacity animation
    gsap.fromTo(
      wordElements,
      { 
        opacity: baseOpacity, 
        willChange: 'opacity, filter',
        y: 20
      },
      {
        ease: 'power2.out',
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.8,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: 'top 75%',
          end: 'bottom 25%',
          scrub: 1
        }
      }
    );

    // Blur animation
    if (enableBlur) {
      gsap.fromTo(
        wordElements,
        { filter: `blur(${blurStrength}px)` },
        {
          ease: 'power2.out',
          filter: 'blur(0px)',
          stagger: 0.1,
          duration: 0.8,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top 75%',
            end: 'bottom 25%',
            scrub: 1
          }
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === el) {
          trigger.kill();
        }
      });
    };
  }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

  return (
    <h2 ref={containerRef} className={`scroll-reveal ${containerClassName}`}>
      <p className={`scroll-reveal-text ${textClassName}`}>{splitText}</p>
    </h2>
  );
};

export default ScrollReveal;