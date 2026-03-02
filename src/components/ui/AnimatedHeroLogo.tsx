'use client';

import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

interface AnimatedHeroLogoProps {
  className?: string;
  autoPlay?: boolean;
  onColorChange?: (color: string) => void;
}

const moduleNames = [
  { name: 'checkly', color: '#F1E194' },
  { name: 'stockly', color: '#789A99' },
  { name: 'teamly', color: '#D37E91' },
  { name: 'planly', color: '#ACC8A2' },
  { name: 'assetly', color: '#F3E7D9' },
  { name: 'msgly', color: '#CBDDE9' },
  { name: 'opsly', color: '#FFFFFF' },
];

export default function AnimatedHeroLogo({
  className = '',
  autoPlay = true,
  onColorChange,
}: AnimatedHeroLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const masterTlRef = useRef<gsap.core.Timeline | null>(null);
  const textRef = useRef<SVGTextElement>(null);
  const barsRef = useRef<(SVGRectElement | null)[]>([]);
  const onColorChangeRef = useRef(onColorChange);
  onColorChangeRef.current = onColorChange;

  const playAnimation = useCallback(() => {
    if (!containerRef.current || !textRef.current) return;

    if (masterTlRef.current) masterTlRef.current.kill();

    const container = containerRef.current;
    const bars = container.querySelectorAll('.anim-bar');
    const drawPaths = container.querySelectorAll('.draw-path');
    const dots = container.querySelectorAll('.anim-dot');
    const textEl = textRef.current;

    const tl = gsap.timeline();
    masterTlRef.current = tl;

    // Reset state
    tl.set(drawPaths, { strokeDasharray: 600, strokeDashoffset: 600 });
    tl.set(bars, {
      opacity: 0,
      y: (_i: number, _t: Element, targets: Element[]) => {
        const idx = Array.from(targets).indexOf(_t);
        return idx % 2 === 0 ? -100 : 100;
      },
      rotation: () => Math.random() * 40 - 20,
      transformOrigin: 'center center',
    });
    tl.set(dots, { scale: 0, transformOrigin: 'center center' });
    tl.set(textEl, { opacity: 0, x: 30, attr: { filter: 'blur(10px)' } });

    // Phase 1: Magnetic assembly
    tl.to(bars, {
      opacity: 1,
      y: 0,
      rotation: 0,
      duration: 1,
      stagger: 0.08,
      ease: 'expo.out',
    });

    // Phase 2: Draw connectors
    tl.to(drawPaths, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: 'power3.inOut',
    }, '-=0.5');

    // Phase 3: Status dots
    tl.to(dots, {
      scale: 1,
      duration: 0.5,
      stagger: 0.1,
      ease: 'back.out(4)',
    }, '-=0.7');

    // Phase 4: First module name appears
    tl.to(textEl, {
      opacity: 1,
      x: 0,
      attr: { filter: 'blur(0px)' },
      duration: 0.8,
      ease: 'power4.out',
      onStart: () => {
        textEl.textContent = moduleNames[0].name;
        textEl.setAttribute('fill', moduleNames[0].color);
        onColorChangeRef.current?.(moduleNames[0].color);
      },
    });

    // Phase 5: Build the looping text cycle timeline
    const textLoop = gsap.timeline({ repeat: -1 });

    // For each module (starting from the first), show it then blur out to next
    moduleNames.forEach((module, i) => {
      // Show current name (blur in)
      if (i > 0) {
        textLoop.to(textEl, {
          opacity: 1,
          x: 0,
          attr: { filter: 'blur(0px)' },
          duration: 1.0,
          ease: 'power4.out',
          onStart: () => {
            textEl.textContent = module.name;
            textEl.setAttribute('fill', module.color);
            onColorChangeRef.current?.(module.color);
          },
        });
      }

      // Hold — longer on 'opsly', standard on others
      const holdTime = module.name === 'opsly' ? 4.0 : 2.0;
      textLoop.to({}, { duration: holdTime });

      // Blur out
      textLoop.to(textEl, {
        opacity: 0,
        x: -20,
        attr: { filter: 'blur(10px)' },
        duration: 0.5,
        ease: 'power4.in',
      });
    });

    // Add the looping timeline after the assembly finishes
    tl.add(textLoop, '+=0.3');
  }, []);

  useEffect(() => {
    if (autoPlay) {
      // Small delay to ensure DOM is painted
      const timer = setTimeout(playAnimation, 100);
      return () => {
        clearTimeout(timer);
        if (masterTlRef.current) masterTlRef.current.kill();
      };
    }
    return () => {
      if (masterTlRef.current) masterTlRef.current.kill();
    };
  }, [autoPlay, playAnimation]);

  // Hover interaction: bars spread out
  const handleMouseEnter = useCallback(() => {
    const bars = containerRef.current?.querySelectorAll('.anim-bar');
    if (!bars) return;
    gsap.to(bars, {
      x: (_i: number) => (_i - 2.5) * 8,
      duration: 0.6,
      ease: 'power2.out',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const bars = containerRef.current?.querySelectorAll('.anim-bar');
    if (!bars) return;
    gsap.to(bars, {
      x: 0,
      duration: 0.6,
      ease: 'elastic.out(1, 0.7)',
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`cursor-pointer w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg viewBox="0 0 1000 290" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="ropeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2c3e50" />
            <stop offset="50%" stopColor="#ecf0f1" />
            <stop offset="100%" stopColor="#2c3e50" />
          </linearGradient>
        </defs>

        <g id="logo-group" transform="translate(150, 140)">
          {/* Connector arcs */}
          <g filter="url(#logo-glow)">
            <path
              className="draw-path"
              d="M 0 60 A 95 35 0 0 0 194 60"
              fill="none"
              stroke="url(#ropeGrad)"
              strokeWidth="2.5"
            />
            <path
              className="draw-path"
              d="M 0 60 A 95 35 0 0 1 194 60"
              fill="none"
              stroke="url(#ropeGrad)"
              strokeWidth="2.5"
            />
          </g>

          {/* Connection lines */}
          <polyline
            className="draw-path"
            points="12,40 25,40 25,75 46,75"
            stroke="#444"
            strokeWidth="1"
            fill="none"
          />
          <polyline
            className="draw-path"
            points="114,55 140,55 140,70 182,70"
            stroke="#444"
            strokeWidth="1"
            fill="none"
          />

          {/* Bars */}
          <g>
            <rect ref={el => { barsRef.current[0] = el; }} className="anim-bar" x="0" y="10" width="24" height="110" rx="12" fill="#1B2624" />
            <rect ref={el => { barsRef.current[1] = el; }} className="anim-bar" x="34" y="30" width="24" height="90" rx="12" fill="#8B2E3E" />
            <rect ref={el => { barsRef.current[2] = el; }} className="anim-bar" x="68" y="15" width="24" height="105" rx="12" fill="#D9868C" />
            <rect ref={el => { barsRef.current[3] = el; }} className="anim-bar" x="102" y="25" width="24" height="95" rx="12" fill="#5D8AA8" />
            <rect ref={el => { barsRef.current[4] = el; }} className="anim-bar" x="136" y="10" width="24" height="110" rx="12" fill="#87B0D6" />
            <rect ref={el => { barsRef.current[5] = el; }} className="anim-bar" x="170" y="20" width="24" height="100" rx="12" fill="#9AC297" />
          </g>

          {/* Connection dots */}
          <circle className="anim-dot" cx="12" cy="40" r="3" fill="#ecf0f1" />
          <circle className="anim-dot" cx="46" cy="75" r="3" fill="#ecf0f1" />
          <circle className="anim-dot" cx="114" cy="55" r="3" fill="#ecf0f1" />
          <circle className="anim-dot" cx="182" cy="70" r="3" fill="#ecf0f1" />
        </g>

        {/* Module text */}
        <text
          ref={textRef}
          x="420"
          y="235"
          fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
          fontSize="110"
          fontWeight="700"
          fill="#E8E8E8"
          letterSpacing="-3"
        >
          opsly
        </text>
      </svg>
    </div>
  );
}
