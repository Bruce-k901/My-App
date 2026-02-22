"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import Link from "next/link";
import DarkVeil from "@/components/ui/DarkVeil";
import AnimatedHeroLogo from "@/components/ui/AnimatedHeroLogo";
import {
  ShieldCheck,
  Key,
  WifiOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  User,
  Briefcase,
  Building2,
} from '@/components/ui/icons';

// Module data
const modules = [
  {
    name: 'Checkly',
    tagline: 'Never miss a check again',
    color: 'checkly',
    features: [
      'Digital checklists & audits',
      'Temperature monitoring',
      'Asset management & PPM',
      'EHO readiness reporting'
    ],
    link: '/product#checkly'
  },
  {
    name: 'Stockly',
    tagline: 'Know what you have, everywhere',
    color: 'stockly',
    features: [
      'Multi-site inventory tracking',
      'Recipe costing & GP analysis',
      'Waste tracking & reporting',
      'Purchase orders & invoicing'
    ],
    link: '/product#stockly'
  },
  {
    name: 'Teamly',
    tagline: 'Your team, organized',
    color: 'teamly',
    features: [
      'HR & recruitment',
      'Training & certifications',
      'Shift scheduling',
      'Payroll processing'
    ],
    link: '/product#teamly'
  },
  {
    name: 'Planly',
    tagline: 'Plan, produce, deliver',
    color: 'planly',
    features: [
      'Production scheduling',
      'Order book management',
      'Customer management',
      'Delivery planning'
    ],
    link: '/product#planly'
  },
  {
    name: 'Assetly',
    tagline: 'Keep assets running smoothly',
    color: 'assetly',
    features: [
      'Equipment tracking',
      'Maintenance scheduling',
      'Service history logs',
      'Asset performance metrics'
    ],
    link: '/product#assetly'
  },
  {
    name: 'Msgly',
    tagline: 'Team communication, simplified',
    color: 'msgly',
    features: [
      'Team chat & channels',
      'Task assignments',
      'File sharing',
      'Meeting scheduling'
    ],
    link: '/product#msgly'
  }
];

function ModulesCarouselSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef(0);
  const [cardWidth, setCardWidth] = useState(400);

  // Calculate card width to show 3 cards
  useEffect(() => {
    const updateCardWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const gap = 24;
        // Calculate width for 3 cards: (containerWidth - 2 gaps) / 3
        const calculatedWidth = (containerWidth - (2 * gap)) / 3;
        setCardWidth(Math.max(300, Math.min(calculatedWidth, 450))); // Min 300px, max 450px
      }
    };

    updateCardWidth();
    window.addEventListener('resize', updateCardWidth);
    return () => window.removeEventListener('resize', updateCardWidth);
  }, []);

  const next = () => {
    setCurrentIndex((prev) => {
      const nextIndex = (prev + 1) % modules.length;
      // If we're looping back to 0, we'll handle seamless transition
      return nextIndex;
    });
    // Reset auto-play timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 100);
  };

  const prev = () => {
    setCurrentIndex((prev) => {
      const prevIndex = (prev - 1 + modules.length) % modules.length;
      return prevIndex;
    });
    // Reset auto-play timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 100);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    // Reset auto-play timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 100);
  };

  // Auto-advance every 6 seconds with seamless looping
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % modules.length);
    }, 6000); // 6 seconds per slide

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);


  // Create infinite loop by duplicating modules (more copies for seamless effect)
  const duplicatedModules = [...modules, ...modules, ...modules, ...modules];
  const startIndex = modules.length * 2; // Start in the third set for more room

  const colorClasses: Record<string, { text: string; border: string; gradient: string; icon: string; dot: string }> = {
    checkly: {
      text: 'text-checkly',
      border: 'hover:border-checkly/30 hover:shadow-[0_0_15px_rgba(241,225,148,0.15)]',
      gradient: 'bg-checkly/[0.04]',
      icon: 'text-checkly',
      dot: 'bg-checkly',
    },
    stockly: {
      text: 'text-stockly',
      border: 'hover:border-stockly/30 hover:shadow-[0_0_15px_rgba(120,154,153,0.15)]',
      gradient: 'bg-stockly/[0.04]',
      icon: 'text-stockly',
      dot: 'bg-stockly',
    },
    teamly: {
      text: 'text-teamly',
      border: 'hover:border-teamly/30 hover:shadow-[0_0_15px_rgba(211,126,145,0.15)]',
      gradient: 'bg-teamly/[0.04]',
      icon: 'text-teamly',
      dot: 'bg-teamly',
    },
    planly: {
      text: 'text-planly',
      border: 'hover:border-planly/30 hover:shadow-[0_0_15px_rgba(172,200,162,0.15)]',
      gradient: 'bg-planly/[0.04]',
      icon: 'text-planly',
      dot: 'bg-planly',
    },
    assetly: {
      text: 'text-assetly',
      border: 'hover:border-assetly/30 hover:shadow-[0_0_15px_rgba(243,231,217,0.15)]',
      gradient: 'bg-assetly/[0.04]',
      icon: 'text-assetly',
      dot: 'bg-assetly',
    },
    msgly: {
      text: 'text-msgly',
      border: 'hover:border-msgly/30 hover:shadow-[0_0_15px_rgba(203,221,233,0.15)]',
      gradient: 'bg-msgly/[0.04]',
      icon: 'text-msgly',
      dot: 'bg-msgly',
    },
  };

  // Calculate translateX for wheel effect - center the middle card of 3 visible cards
  const gap = 24;
  const totalCardWidth = cardWidth + gap;
  // Calculate which card should be centered (the middle of the 3 visible cards)
  // We want to show currentIndex, currentIndex+1, currentIndex+2
  // Center on currentIndex+1 (the middle card)
  const centerOffset = 1; // Center the middle card of the 3 visible
  const activeIndex = startIndex + currentIndex + centerOffset;
  
  // Use CSS calc to center: 50% of container minus half card width, minus card position
  const translateX = `calc(50% - ${cardWidth / 2}px - ${activeIndex * totalCardWidth}px)`;

  // Handle seamless loop - reset position when looping from end to start
  useEffect(() => {
    if (!carouselRef.current) return;

    // Check if we just looped from end (modules.length - 1) to start (0)
    if (prevIndexRef.current === modules.length - 1 && currentIndex === 0) {
      // We've looped back to start - instantly reset to equivalent position in next set
      // This makes the first card appear to come from the right seamlessly
      const resetIndex = startIndex + centerOffset;
      carouselRef.current.style.transition = 'none';
      carouselRef.current.style.transform = `translateX(calc(50% - ${cardWidth / 2}px - ${resetIndex * totalCardWidth}px))`;
      // Force reflow
      void carouselRef.current.offsetWidth;
      // Re-enable transition for next animation
      requestAnimationFrame(() => {
        if (carouselRef.current) {
          carouselRef.current.style.transition = '';
        }
      });
    }
    
    prevIndexRef.current = currentIndex;
  }, [currentIndex, cardWidth, gap, totalCardWidth, startIndex, centerOffset]);

  return (
    <section className="py-8 sm:py-10 md:py-12 px-2 sm:px-4 relative">
      <div className="max-w-[95%] sm:max-w-[90%] lg:max-w-[85%] xl:max-w-[1400px] mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 text-theme-primary">
          Six Modules. One Platform.
        </h2>
        <p className="text-center text-theme-tertiary mb-4 sm:mb-6 text-sm sm:text-base">
          Everything your operation needs, working together seamlessly
        </p>

        <div
          ref={containerRef}
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Carousel Track - Horizontal scrolling wheel */}
          <div
            ref={carouselRef}
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(${translateX})`,
            }}
          >
            {duplicatedModules.map((module, idx) => {
              const colors = colorClasses[module.color] || colorClasses.checkly;
              
              return (
                <div
                  key={`${module.name}-${idx}`}
                  className="flex-shrink-0 rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 transition-all duration-300 flex flex-col"
                  style={{ 
                    width: `${cardWidth}px`,
                    minHeight: '320px',
                    marginRight: `${gap}px`,
                  }}
                >
                  <h3 className="text-2xl font-bold text-theme-primary mb-2">{module.name}</h3>
                  <p className={`text-base mb-4 ${colors.text}`}>{module.tagline}</p>
                  
                  <ul className="space-y-2 mb-4">
                    {module.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${colors.icon} mt-0.5 flex-shrink-0`} />
                        <span className="text-sm text-theme-tertiary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Small colored accent bar - much smaller than before */}
                  <div className={`h-1.5 rounded-full mb-4 ${colors.gradient}`} />

                  <Link href={module.link} className={`inline-flex items-center gap-2 ${colors.text} hover:opacity-80 transition font-medium text-sm`}>
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/20 transition z-10"
            aria-label="Previous module"
          >
            <ChevronLeft className="w-6 h-6 text-theme-primary" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/20 transition z-10"
            aria-label="Next module"
          >
            <ChevronRight className="w-6 h-6 text-theme-primary" />
          </button>

          {/* Progress Indicator Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {modules.map((module, index) => {
              const colors = colorClasses[module.color] || colorClasses.checkly;
              return (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? `w-8 ${colors.dot}` 
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const features = [
    {
      title: 'Data Security',
      description: 'End-to-end encryption, row-level access controls, and infrastructure hosted on Supabase with SOC 2 compliance. Your operational data is protected at every layer.',
      icon: ShieldCheck,
    },
    {
      title: 'Data Ownership',
      description: 'Your data belongs to you. Export everything at any time, no lock-in, no hidden fees. You maintain full control and portability.',
      icon: Key,
    },
    {
      title: 'Offline Access',
      description: 'Keep working when connectivity drops. Checks, logs, and tasks sync automatically when you are back online — critical for sites with unreliable signal.',
      icon: WifiOff,
    },
  ];

  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-theme-primary mb-4">
            Built on{' '}
            <span className="text-[#e8e8e8]">Trust</span>
          </h2>
          <p className="text-theme-tertiary text-sm sm:text-base max-w-2xl mx-auto">
            Your operations data deserves the same care you put into running them
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                <div className="relative p-6 sm:p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300 h-full">
                  <div className="mb-4">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white/40" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-light text-theme-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-theme-tertiary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}


const MODULE_LABEL_COLORS: Record<string, string> = {
  checkly: 'text-checkly',
  stockly: 'text-stockly',
  teamly: 'text-teamly',
  planly: 'text-planly',
  assetly: 'text-assetly',
  msgly: 'text-msgly',
  dashboard: 'text-white/50',
};

const MODULE_DOT_COLORS: Record<string, string> = {
  checkly: 'bg-checkly',
  stockly: 'bg-stockly',
  teamly: 'bg-teamly',
  planly: 'bg-planly',
  assetly: 'bg-assetly',
  msgly: 'bg-msgly',
  dashboard: 'bg-white/30',
};

type JourneyEntry = {
  time: string;
  activity: string;
  detail: string;
  modules: string[];
};

const journeyData: Record<string, { label: string; icon: typeof User; entries: JourneyEntry[] }> = {
  staff: {
    label: 'Staff',
    icon: User,
    entries: [
      {
        time: '6:00 AM',
        activity: 'Clock in',
        detail: 'On your phone, even in the stockroom with no signal — syncs when you are back online.',
        modules: ['teamly'],
      },
      {
        time: '6:15 AM',
        activity: 'Opening checks',
        detail: 'Today\'s tasks are ready: fridge temps, cleaning logs, prep checks. Tap through them one by one.',
        modules: ['checkly'],
      },
      {
        time: '9:00 AM',
        activity: 'Delivery arrives',
        detail: 'Snap a photo of the invoice. AI reads every line, matches items to your stock list automatically.',
        modules: ['stockly'],
      },
      {
        time: '10:30 AM',
        activity: 'Fridge playing up',
        detail: 'Take a photo, raise a callout on the asset record. Your manager gets a message instantly.',
        modules: ['assetly', 'msgly'],
      },
      {
        time: '2:00 PM',
        activity: 'Quiet spell',
        detail: 'Pick up your Level 2 Food Safety course right where you left off — on your phone.',
        modules: ['teamly'],
      },
      {
        time: '4:30 PM',
        activity: 'Close down',
        detail: 'Closing checks, log today\'s waste, clock out. All from one screen.',
        modules: ['checkly', 'stockly', 'teamly'],
      },
    ],
  },
  manager: {
    label: 'Managers',
    icon: Briefcase,
    entries: [
      {
        time: '7:00 AM',
        activity: 'Morning dashboard',
        detail: '3 staff clocked in, 12 tasks due today, 1 overnight temperature alert. Everything at a glance.',
        modules: ['dashboard'],
      },
      {
        time: '7:30 AM',
        activity: 'Temperature breach',
        detail: 'Walk-in hit -15\u00B0C at 2am, back to -18\u00B0C by 3am. Assign corrective action, log the outcome.',
        modules: ['checkly'],
      },
      {
        time: '9:30 AM',
        activity: 'Invoice review',
        detail: 'AI matched 47 of 50 lines automatically. Approve with two taps, flag the rest for checking.',
        modules: ['stockly'],
      },
      {
        time: '10:30 AM',
        activity: 'Equipment callout',
        detail: 'Staff flagged the fridge — book the contractor, track the repair on the asset record. All in one thread.',
        modules: ['assetly', 'msgly'],
      },
      {
        time: '1:00 PM',
        activity: 'Build next week\'s rota',
        detail: 'Drag shifts into place, see labour costs update live. Publish to the whole team in one tap.',
        modules: ['teamly'],
      },
      {
        time: '5:00 PM',
        activity: 'End of day',
        detail: 'Compliance at 94%. All closing tasks signed off across both your sites.',
        modules: ['checkly'],
      },
    ],
  },
  senior: {
    label: 'Senior Leaders',
    icon: Building2,
    entries: [
      {
        time: '8:00 AM',
        activity: 'All-sites overview',
        detail: '12 sites on one dashboard. Compliance scores, task completion, live alerts — no chasing managers for updates.',
        modules: ['dashboard'],
      },
      {
        time: '9:00 AM',
        activity: 'Health check alert',
        detail: 'Site 4 flagged: 3 overdue risk assessments. Delegate to the site manager with one click.',
        modules: ['checkly'],
      },
      {
        time: '10:00 AM',
        activity: 'EHO inspection prep',
        detail: 'Generate the full compliance pack for tomorrow\'s visit. One click, one PDF — ready to print.',
        modules: ['checkly'],
      },
      {
        time: '11:00 AM',
        activity: 'Food cost review',
        detail: 'Company-wide GP at 68%. Drill into Site 2\'s dip — waste up 18% this week. Message the manager.',
        modules: ['stockly', 'msgly'],
      },
      {
        time: '1:00 PM',
        activity: 'Payroll',
        detail: '\u00A347K across 12 sites. Review the summary, approve the run. Done.',
        modules: ['teamly'],
      },
      {
        time: '4:00 PM',
        activity: 'Maintenance overview',
        detail: '6 assets overdue for service across the estate. Prioritise, assign to contractors, track completion.',
        modules: ['assetly'],
      },
    ],
  },
};

const MODULE_NAMES: Record<string, string> = {
  checkly: 'Checkly',
  stockly: 'Stockly',
  teamly: 'Teamly',
  planly: 'Planly',
  assetly: 'Assetly',
  msgly: 'Msgly',
  dashboard: 'Dashboard',
};

function DayJourneySection() {
  const [activeRole, setActiveRole] = useState<string>('staff');
  const role = journeyData[activeRole];

  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/30 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-theme-primary mb-4">
            A Day with{' '}
            <span className="text-[#e8e8e8]">Opsly</span>
          </h2>
          <p className="text-theme-tertiary text-sm sm:text-base max-w-2xl mx-auto">
            From open to close, every role stays connected on one platform
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-10 sm:mb-14">
          {Object.entries(journeyData).map(([key, data]) => {
            const Icon = data.icon;
            const isActive = activeRole === key;
            return (
              <button
                key={key}
                onClick={() => setActiveRole(key)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-light transition-all duration-300 ${
                  isActive
                    ? 'bg-white/10 border border-white/15 text-theme-primary'
                    : 'bg-transparent border border-white/5 text-theme-tertiary hover:border-white/10 hover:text-theme-secondary'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {data.label}
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[4.5rem] sm:left-[5.5rem] top-2 bottom-2 w-px bg-gradient-to-b from-white/10 via-white/10 to-transparent" />

            <div className="space-y-6 sm:space-y-8">
              {role.entries.map((entry, idx) => (
                <div key={`${activeRole}-${idx}`} className="flex gap-4 sm:gap-5">
                  {/* Time */}
                  <div className="w-16 sm:w-20 flex-shrink-0 text-right pt-0.5">
                    <span className="text-xs sm:text-sm text-white/30 font-light tabular-nums">
                      {entry.time}
                    </span>
                  </div>

                  {/* Dot */}
                  <div className="flex-shrink-0 pt-1.5 sm:pt-2 relative z-10">
                    <div className="w-2 h-2 rounded-full bg-white/30 ring-4 ring-[#0B0D13]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <h4 className="text-sm sm:text-base font-medium text-theme-primary mb-1">
                      {entry.activity}
                    </h4>
                    <p className="text-theme-tertiary text-xs sm:text-sm leading-relaxed mb-2">
                      {entry.detail}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.modules.map((mod) => (
                        <span
                          key={mod}
                          className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs ${MODULE_LABEL_COLORS[mod]}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${MODULE_DOT_COLORS[mod]}`} />
                          {MODULE_NAMES[mod]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showMarketing, setShowMarketing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [heroColor, setHeroColor] = useState('#e8e8e8');
  const hasCheckedRef = React.useRef(false);

  // Ensure we're on client-side before checking session
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run after component is mounted (client-side)
    if (!mounted) return;
    
    // Prevent multiple checks
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    // Safety timeout: if check takes too long, show marketing page
    const safetyTimeout = setTimeout(() => {
      console.warn("Session check taking too long, showing marketing page");
      setShowMarketing(true);
      setChecking(false);
    }, 3000);
    
    async function checkSession() {
      try {
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        clearTimeout(safetyTimeout);
        
      if (data?.session) {
        console.log("Session exists, redirecting to dashboard");
        router.replace("/dashboard");
          // Don't set checking to false if redirecting - let the redirect happen
          return;
      } else {
          setShowMarketing(true);
          setChecking(false);
        }
      } catch (error) {
        clearTimeout(safetyTimeout);
        console.error("Error checking session:", error);
        // On error, show marketing page (user can still navigate)
        setShowMarketing(true);
        setChecking(false);
      }
    }
    checkSession();
    
    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [router, mounted]);

  // Show loading state only briefly, then show marketing page as fallback
  if (checking && !showMarketing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-theme-primary">Checking authentication...</div>
      </div>
    );
  }

  // If we're redirecting, show a brief message
  if (!showMarketing && !checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-theme-primary">Redirecting...</div>
      </div>
    );
  }

  return (
    <MarketingSubPageLayout>
      {/* HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-6 sm:py-8 md:py-10 overflow-hidden min-h-[400px] sm:min-h-[500px]">
        {/* DarkVeil Background */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-[500px] sm:h-[600px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <DarkVeil />
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex justify-center mb-1 sm:mb-2 w-full max-w-2xl mx-auto">
            <AnimatedHeroLogo onColorChange={setHeroColor} />
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 px-2"
            style={{ color: heroColor, transition: 'color 0.4s ease-out' }}
          >
            Run Your Operations on One Platform
          </h1>
          
          <p className="text-theme-secondary max-w-3xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed mb-4 sm:mb-6 px-4">
            Opsly unifies compliance, inventory, people, and production for hospitality, 
            retail, and manufacturing businesses. Stop juggling 5+ tools. Start running smarter.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 mb-4 sm:mb-6">
            <Link href="/signup" className="btn-marketing-primary text-sm sm:text-base">
              Start Free Trial
            </Link>
            <Link href="/contact" className="btn-marketing-secondary text-sm sm:text-base">
              Book a Demo
            </Link>
          </div>
          
          {/* Module badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4 pb-2">
            <span className="text-xs sm:text-sm font-medium text-checkly">Checkly</span>
            <span className="text-xs sm:text-sm text-white/30">•</span>
            <span className="text-xs sm:text-sm font-medium text-stockly">Stockly</span>
            <span className="text-xs sm:text-sm text-white/30">•</span>
            <span className="text-xs sm:text-sm font-medium text-teamly">Teamly</span>
            <span className="text-xs sm:text-sm text-white/30">•</span>
            <span className="text-xs sm:text-sm font-medium text-planly">Planly</span>
            <span className="text-xs sm:text-sm text-white/30">•</span>
            <span className="text-xs sm:text-sm font-medium text-assetly">Assetly</span>
            <span className="text-xs sm:text-sm text-white/30">•</span>
            <span className="text-xs sm:text-sm font-medium text-msgly">Msgly</span>
          </div>
        </div>
      </section>

      {/* MODULES CAROUSEL SECTION */}
      <ModulesCarouselSection />

      {/* CTA STRIP */}
      <div className="relative py-12 sm:py-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="text-center">
          <p className="text-theme-tertiary text-sm sm:text-base mb-5">
            Ready to simplify your ops?
          </p>
          <Link href="/signup" className="btn-marketing-primary inline-block">
            Start Free Trial
          </Link>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* TRUST SECTION */}
      <TrustSection />

      {/* DAY JOURNEY SECTION */}
      <DayJourneySection />

      {/* CTA SECTION - Refined */}
      <section className="relative py-20 sm:py-24 md:py-32 overflow-hidden">
        {/* Sophisticated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900/95 to-black" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-theme-primary mb-4 sm:mb-6">
              Ready to Simplify Your{' '}
              <span className="text-[#e8e8e8]">
                Operations
              </span>
              ?
            </h2>
            
            {/* Subheading */}
            <p className="text-theme-tertiary text-base sm:text-lg mb-8 sm:mb-12">
              Join businesses that replaced fragmented tools with Opsly
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/contact">
                <button className="btn-marketing-secondary text-sm sm:text-base">
                  Book a Demo →
                </button>
              </Link>
              
              <Link href="/signup">
                <button className="btn-marketing-primary text-sm sm:text-base">
                  Start Free Trial
                </button>
              </Link>
            </div>

            {/* Trust indicator */}
            <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2 text-xs sm:text-sm text-theme-tertiary">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
              <span className="text-theme-secondary">•</span>
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
