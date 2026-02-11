"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import Link from "next/link";
import { Button } from "@/components/ui";
import DarkVeil from "@/components/ui/DarkVeil";
import { OpslyLogo } from "@/components/ui/opsly-logo";
import {
  Shield,
  ClipboardCheck,
  Thermometer,
  Wrench,
  LayoutDashboard,
  Bell,
  CheckCircle2,
  ListChecks,
  BarChart3,
  FileText,
  AlertTriangle,
  Package,
  Users,
  Factory,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  DollarSign,
  Clock,
  Zap,
  Network,
  MessageSquare,
  ClipboardList,
  User,
  Briefcase,
  Building2,
  ArrowLeftRight,
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
      text: 'text-[#D37E91]',
      border: 'hover:border-[#D37E91]/50 hover:shadow-[0_0_18px_rgba(211, 126, 145,0.35)]',
      gradient: 'bg-gradient-to-br from-[#3a2028] to-gray-900',
      icon: 'text-[#D37E91]',
      dot: 'bg-[#D37E91]',
    },
    stockly: {
      text: 'text-emerald-400',
      border: 'hover:border-emerald-400/50 hover:shadow-[0_0_18px_rgba(16,185,129,0.35)]',
      gradient: 'bg-gradient-to-br from-emerald-900 to-gray-900',
      icon: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
    teamly: {
      text: 'text-blue-400',
      border: 'hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.35)]',
      gradient: 'bg-gradient-to-br from-blue-900 to-gray-900',
      icon: 'text-blue-400',
      dot: 'bg-blue-400',
    },
    planly: {
      text: 'text-purple-400',
      border: 'hover:border-purple-400/50 hover:shadow-[0_0_18px_rgba(139,92,246,0.35)]',
      gradient: 'bg-gradient-to-br from-purple-900 to-gray-900',
      icon: 'text-purple-400',
      dot: 'bg-purple-400',
    },
    assetly: {
      text: 'text-amber-400',
      border: 'hover:border-amber-400/50 hover:shadow-[0_0_18px_rgba(245,158,11,0.35)]',
      gradient: 'bg-gradient-to-br from-amber-900 to-gray-900',
      icon: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    msgly: {
      text: 'text-cyan-400',
      border: 'hover:border-cyan-400/50 hover:shadow-[0_0_18px_rgba(6,182,212,0.35)]',
      gradient: 'bg-gradient-to-br from-cyan-900 to-gray-900',
      icon: 'text-cyan-400',
      dot: 'bg-cyan-400',
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
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 text-white">
          Six Modules. One Platform.
        </h2>
        <p className="text-center text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
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
                  <h3 className="text-2xl font-bold text-white mb-2">{module.name}</h3>
                  <p className={`text-base mb-4 ${colors.text}`}>{module.tagline}</p>
                  
                  <ul className="space-y-2 mb-4">
                    {module.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${colors.icon} mt-0.5 flex-shrink-0`} />
                        <span className="text-sm text-gray-300">{feature}</span>
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
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/20 transition z-10"
            aria-label="Next module"
          >
            <ChevronRight className="w-6 h-6 text-white" />
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

function TopBenefitsSection() {
  const benefits = [
    {
      title: 'Compliance without chaos',
      description: 'Logs, checks, and reports in one place. Be inspection-ready without last-minute firefighting.',
      icon: CheckCircle2,
      color: 'pink',
    },
    {
      title: 'Less reactive, more proactive',
      description: 'Automate alerts and cut noisy threads. Track temperature and incidents automatically.',
      icon: Zap,
      color: 'blue',
    },
    {
      title: 'Built to scale',
      description: 'Roll out across sites with head office visibility. Start fast, grow easily.',
      icon: BarChart3,
      color: 'emerald',
    },
    {
      title: 'Single source of truth',
      description: 'Everyone stays aligned on one platform. Tasks, checks, logs, and incidents in one place.',
      icon: FileText,
      color: 'orange',
    },
  ];

  const colorClasses = {
    pink: {
      gradient: 'from-[#D37E91]/15',
      icon: 'text-[#D37E91]/50',
      hover: 'group-hover:opacity-100',
    },
    blue: {
      gradient: 'from-blue-500/10',
      icon: 'text-blue-400/50',
      hover: 'group-hover:opacity-100',
    },
    emerald: {
      gradient: 'from-emerald-500/10',
      icon: 'text-emerald-400/50',
      hover: 'group-hover:opacity-100',
    },
    orange: {
      gradient: 'from-orange-500/10',
      icon: 'text-orange-400/50',
      hover: 'group-hover:opacity-100',
    },
  };

  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
      {/* Elegant background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4">
            Why Opsly Works
          </h2>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            Built for operations teams who need power and simplicity
          </p>
        </div>

        {/* Benefits Grid - More refined */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16 sm:mb-20 md:mb-24">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            const colors = colorClasses[benefit.color as keyof typeof colorClasses];
            
            return (
              <div key={idx} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} to-transparent opacity-0 ${colors.hover} transition-opacity duration-500 rounded-2xl`} />
                <div className="relative p-6 sm:p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0">
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.icon}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-light text-white mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Section - Refined presentation */}
        <div className="relative">
          {/* Subtle separator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="grid md:grid-cols-3 gap-8 sm:gap-12 max-w-5xl mx-auto pt-12 sm:pt-16">
            {/* Stat 1 */}
            <div className="text-center group">
              <div className="relative inline-block mb-4">
                <div className="text-4xl sm:text-5xl md:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-br from-[#D37E91] to-[#D37E91]/80">
                  100+
                </div>
                <div className="absolute -inset-4 bg-[#D37E91]/15 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="text-gray-400 text-sm">
                Sites using Opsly
              </div>
            </div>

            {/* Stat 2 */}
            <div className="text-center group">
              <div className="relative inline-block mb-4">
                <div className="text-4xl sm:text-5xl md:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">
                  50K+
                </div>
                <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="text-gray-400 text-sm">
                Checks completed daily
              </div>
            </div>

            {/* Stat 3 */}
            <div className="text-center group">
              <div className="relative inline-block mb-4">
                <div className="text-4xl sm:text-5xl md:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600">
                  75%
                </div>
                <div className="absolute -inset-4 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="text-gray-400 text-sm">
                Reduction in compliance time
              </div>
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
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }

  // If we're redirecting, show a brief message
  if (!showMarketing && !checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-white">Redirecting...</div>
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
          <div className="flex justify-center mb-4 sm:mb-6">
            <OpslyLogo 
              variant="horizontal" 
              size="xl" 
              showTagline 
              className=""
              animated={true}
              delay={300}
            />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 px-2 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(211, 126, 145,0.4)]">
            Run Your Operations on One Platform
          </h1>
          
          <p className="text-slate-300 max-w-3xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed mb-4 sm:mb-6 px-4">
            Opsly unifies compliance, inventory, people, and production for hospitality, 
            retail, and manufacturing businesses. Stop juggling 5+ tools. Start running smarter.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 mb-4 sm:mb-6">
            <Link href="/signup">
              <Button variant="primary">Start Free Trial</Button>
            </Link>
            <Link href="/contact">
              <Button variant="primary">Book a Demo</Button>
            </Link>
          </div>
          
          {/* Module badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4 pb-2">
            <span className="text-xs sm:text-sm text-gray-400">Checkly</span>
            <span className="text-xs sm:text-sm text-gray-600">•</span>
            <span className="text-xs sm:text-sm text-gray-400">Stockly</span>
            <span className="text-xs sm:text-sm text-gray-600">•</span>
            <span className="text-xs sm:text-sm text-gray-400">Teamly</span>
            <span className="text-xs sm:text-sm text-gray-600">•</span>
            <span className="text-xs sm:text-sm text-gray-400">Planly</span>
            <span className="text-xs sm:text-sm text-gray-600">•</span>
            <span className="text-xs sm:text-sm text-gray-400">Assetly</span>
            <span className="text-xs sm:text-sm text-gray-600">•</span>
            <span className="text-xs sm:text-sm text-gray-400">Msgly</span>
          </div>
        </div>
      </section>

      {/* MODULES CAROUSEL SECTION */}
      <ModulesCarouselSection />

      {/* BEFORE/AFTER COMPARISON SECTION - Refined */}
      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
        {/* Very subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/30 to-transparent" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          {/* Section Header - More refined */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 text-white">
              The Real Cost of{' '}
              <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#D37E91]/80 to-[#544349]/80">
                Operations Chaos
              </span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              See what happens when you unify your operations
            </p>
          </div>

          {/* Before/After Grid - Table-like layout */}
          <div className="max-w-6xl mx-auto">
            {/* Header Row */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-10">
              <div>
                <span className="text-sm sm:text-base uppercase tracking-wider text-gray-500 font-bold">
                  Before Opsly
                </span>
              </div>
              <div>
                <span className="text-sm sm:text-base uppercase tracking-wider text-gray-400 font-bold">
                  After Opsly
                </span>
              </div>
            </div>

            {/* Table Rows */}
            <div className="space-y-6 sm:space-y-8">
              {/* Row 1 */}
              <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Before Stat 1 */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="mt-1 text-red-400/40 flex-shrink-0">
                      <DollarSign className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl sm:text-3xl font-light text-gray-200 mb-3 min-h-[3rem] flex items-center">
                        £450<span className="text-gray-500">/month</span>
                      </div>
                      <div className="text-gray-500 text-base leading-relaxed">
                        Paying for multiple disconnected tools, each with their own subscription
                      </div>
                    </div>
                  </div>
                </div>

                {/* After Stat 1 */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="mt-1 text-emerald-400/50 flex-shrink-0">
                      <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl sm:text-3xl font-light text-gray-100 mb-3 min-h-[3rem] flex items-center">
                        One Simple Price
                      </div>
                      <div className="text-gray-400 text-base leading-relaxed">
                        All modules included, predictable costs, no surprise bills
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Before Stat 2 */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="mt-1 text-red-400/40 flex-shrink-0">
                      <Network className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl sm:text-3xl font-light text-gray-200 mb-3 min-h-[3rem] flex items-center">
                        5–10 <span className="text-gray-500">Systems</span>
                      </div>
                      <div className="text-gray-500 text-base leading-relaxed">
                        Different logins, duplicate data entry, nothing talks to each other
                      </div>
                    </div>
                  </div>
                </div>

                {/* After Stat 2 */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="mt-1 text-emerald-400/50 flex-shrink-0">
                      <Network className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl sm:text-3xl font-light text-gray-100 mb-3 min-h-[3rem] flex items-center">
                        One Platform
                      </div>
                      <div className="text-gray-400 text-base leading-relaxed">
                        Everything connected, single source of truth, one login
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Before Stat 3 */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="mt-1 text-red-400/40 flex-shrink-0">
                      <Clock className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl sm:text-3xl font-light text-gray-200 mb-3 min-h-[3rem] flex items-center">
                        Hours <span className="text-gray-500">Wasted</span>
                      </div>
                      <div className="text-gray-500 text-base leading-relaxed">
                        Manual data entry, reconciliation, and chasing information daily
                      </div>
                    </div>
                  </div>
                </div>

                {/* After Stat 3 */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="mt-1 text-emerald-400/50 flex-shrink-0">
                      <Zap className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl sm:text-3xl font-light text-gray-100 mb-3 min-h-[3rem] flex items-center">
                        Automated
                      </div>
                      <div className="text-gray-400 text-base leading-relaxed">
                        Workflows handle the busywork, your team focuses on what matters
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Refined CTA */}
          <div className="text-center mt-12 sm:mt-16 md:mt-20">
            <Link href="/signup">
              <button className="group px-6 sm:px-8 py-3 sm:py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-light rounded-lg transition-all duration-300 text-sm sm:text-base">
                Calculate Your Savings
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* TOP BENEFITS SECTION */}
      <TopBenefitsSection />

      {/* INTEGRATION STORY - Connected Ecosystem */}
      <section className="relative py-20 sm:py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          {/* Header - More impactful */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4">
              Everything Works{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D37E91] to-[#544349]">
                Together
              </span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Unlike fragmented point solutions, Opsly creates a unified data ecosystem where every module shares information seamlessly
            </p>
          </div>

          {/* Central Hub Visualization */}
          <div className="max-w-6xl mx-auto mb-12 sm:mb-16 md:mb-20">
            <div className="relative">
              {/* Central Dashboard Hub */}
              <div className="flex justify-center mb-12 sm:mb-16">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D37E91]/25 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                  <div className="relative px-8 sm:px-12 py-6 sm:py-8 bg-gray-900/80 backdrop-blur-xl border border-white/20 rounded-2xl">
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-[#D37E91]/70" />
                      </div>
                      <div className="text-lg sm:text-xl font-light text-white mb-1">Unified Dashboard</div>
                      <div className="text-xs sm:text-sm text-gray-400">All your ops KPIs in one place</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connection Lines (decorative) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none hidden md:block">
                <svg className="w-full h-full opacity-20" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                  <line x1="400" y1="100" x2="200" y2="250" stroke="url(#gradient1)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="400" y1="100" x2="600" y2="250" stroke="url(#gradient1)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="400" y1="100" x2="400" y2="300" stroke="url(#gradient1)" strokeWidth="1" strokeDasharray="4 4" />
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#D37E91" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Module Connections Grid */}
              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                {/* Checkly ↔ Assetly */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D37E91]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  <div className="relative p-5 sm:p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-[#D37E91]/90 text-xs sm:text-sm font-medium">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        Checkly
                      </span>
                      <ArrowLeftRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      <span className="flex items-center gap-1.5 text-gray-400/90 text-xs sm:text-sm font-medium">
                        <Wrench className="w-3 h-3 sm:w-4 sm:h-4" />
                        Assetly
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Instant issue reporting on equipment failures
                    </p>
                  </div>
                </div>

                {/* Stockly → Checkly */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  <div className="relative p-5 sm:p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-orange-400/90 text-xs sm:text-sm font-medium">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                        Stockly
                      </span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      <span className="flex items-center gap-1.5 text-[#D37E91]/90 text-xs sm:text-sm font-medium">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        Checkly
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Recipes auto-generate SOPs and compliance checks
                    </p>
                  </div>
                </div>

                {/* Teamly → Stockly */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  <div className="relative p-5 sm:p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-purple-400/90 text-xs sm:text-sm font-medium">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        Teamly
                      </span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      <span className="flex items-center gap-1.5 text-orange-400/90 text-xs sm:text-sm font-medium">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                        Stockly
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Employee costs flow into recipe costing
                    </p>
                  </div>
                </div>

                {/* Planly → Stockly */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  <div className="relative p-5 sm:p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-blue-400/90 text-xs sm:text-sm font-medium">
                        <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4" />
                        Planly
                      </span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      <span className="flex items-center gap-1.5 text-orange-400/90 text-xs sm:text-sm font-medium">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                        Stockly
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Production orders check inventory levels
                    </p>
                  </div>
                </div>

                {/* Checkly → Reports */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D37E91]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  <div className="relative p-5 sm:p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-[#D37E91]/90 text-xs sm:text-sm font-medium">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        Checkly
                      </span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      <span className="flex items-center gap-1.5 text-gray-400/90 text-xs sm:text-sm font-medium">
                        <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                        Reports
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Temperature data feeds compliance reports
                    </p>
                  </div>
                </div>

                {/* Msgly - Central Communication */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  <div className="relative p-5 sm:p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-green-400/20 transition-all duration-300">
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-400/90" />
                      <span className="text-green-400/90 text-xs sm:text-sm font-medium">Msgly</span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed text-center">
                      Connects everyone and everything—discuss tasks, assets, incidents anywhere
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hierarchical Data Section */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-light text-white mb-3">
                Role-Based Intelligence
              </h3>
              <p className="text-gray-400 text-sm sm:text-base">
                Every user sees exactly what they need, when they need it
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {/* Staff Level */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                <div className="relative p-5 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400/70" />
                  </div>
                  <h4 className="text-base sm:text-lg font-light text-white mb-2">Staff</h4>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                    Simple task lists and check completions for their site
                  </p>
                </div>
              </div>

              {/* Manager Level */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                <div className="relative p-5 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400/70" />
                  </div>
                  <h4 className="text-base sm:text-lg font-light text-white mb-2">Managers</h4>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                    Full oversight, analytics, and setup control for their locations
                  </p>
                </div>
              </div>

              {/* Regional/HQ Level */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#D37E91]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                <div className="relative p-5 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-[#D37E91]/15 flex items-center justify-center">
                    <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#D37E91]/70" />
                  </div>
                  <h4 className="text-base sm:text-lg font-light text-white mb-2">Regional & HQ</h4>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                    Cross-site insights, trends, and company-wide performance metrics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white mb-4 sm:mb-6">
              Ready to Simplify Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D37E91] to-[#544349]">
                Operations
              </span>
              ?
            </h2>
            
            {/* Subheading */}
            <p className="text-gray-400 text-base sm:text-lg mb-8 sm:mb-12">
              Join businesses that replaced fragmented tools with Opsly
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/contact">
                <button className="group px-6 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/[0.15] border border-white/20 hover:border-white/30 text-white font-light rounded-lg transition-all duration-300 backdrop-blur-sm text-sm sm:text-base">
                  Book a Demo
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </Link>
              
              <Link href="/signup">
                <button className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#D37E91]/90 to-[#544349]/90 hover:from-[#D37E91] hover:to-[#544349] text-white font-light rounded-lg transition-all duration-300 shadow-lg shadow-[#D37E91]/20 text-sm sm:text-base">
                  Start Free Trial
                </button>
              </Link>
            </div>

            {/* Trust indicator */}
            <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
              <span className="text-gray-700">•</span>
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
