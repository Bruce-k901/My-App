'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DarkVeil from '@/components/ui/DarkVeil';
import { Button } from '@/components/ui';
import { 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Users, 
  MapPin, 
  Wrench, 
  ClipboardCheck, 
  FileText, 
  Shield, 
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowLeft
} from '@/components/ui/icons';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  importance: 'critical' | 'high' | 'medium';
  benefits: string[];
  tips: string[];
  href: string;
}

const setupSteps: SetupStep[] = [
  {
    id: 'business-details',
    title: 'Business Details & Company Information',
    description: 'Configure your company profile, legal information, and organizational structure.',
    icon: <Building2 className="w-5 h-5" />,
    estimatedTime: '10-15 minutes',
    importance: 'critical',
    href: '/dashboard/business',
    benefits: [
      'Enables proper compliance documentation',
      'Ensures legal reporting accuracy',
      'Provides context for all regulatory requirements',
      'Establishes company-wide settings and defaults'
    ],
    tips: [
      'Have your Companies House number ready',
      'Prepare your food business registration number',
      'Keep insurance certificates accessible',
      'Ensure contact details are current'
    ]
  },
  {
    id: 'users',
    title: 'User Management & Roles',
    description: 'Invite team members and assign appropriate roles and permissions.',
    icon: <Users className="w-5 h-5" />,
    estimatedTime: '15-20 minutes',
    importance: 'critical',
    href: '/dashboard/users',
    benefits: [
      'Ensures accountability for all tasks',
      'Enables role-based task assignment',
      'Creates audit trails for compliance',
      'Facilitates team collaboration'
    ],
    tips: [
      'Start with managers and supervisors first',
      'Use role-based permissions (Admin, Manager, Staff)',
      'Verify email addresses before sending invites',
      'Plan shift patterns for task scheduling'
    ]
  },
  {
    id: 'sites',
    title: 'Site Configuration',
    description: 'Add all your venues, locations, and operational sites to the platform.',
    icon: <MapPin className="w-5 h-5" />,
    estimatedTime: '5-10 minutes per site',
    importance: 'critical',
    href: '/dashboard/sites',
    benefits: [
      'Enables site-specific task scheduling',
      'Allows location-based compliance tracking',
      'Facilitates multi-site reporting and analytics',
      'Supports site-specific user permissions'
    ],
    tips: [
      'Add sites in order of priority (flagship first)',
      'Include accurate opening hours for task scheduling',
      'Assign General Managers during setup',
      'Add site-specific contact information'
    ]
  },
  {
    id: 'assets',
    title: 'Asset Registration',
    description: 'Register all equipment, appliances, and infrastructure requiring monitoring or maintenance.',
    icon: <Wrench className="w-5 h-5" />,
    estimatedTime: '20-30 minutes',
    importance: 'high',
    href: '/dashboard/assets',
    benefits: [
      'Enables automated temperature monitoring',
      'Tracks maintenance schedules and PPM',
      'Creates equipment-specific task assignments',
      'Maintains warranty and service history'
    ],
    tips: [
      'Start with temperature-controlled equipment (fridges, freezers)',
      'Include serial numbers and purchase dates',
      'Set working temperature ranges for alerts',
      'Assign contractors for each asset type'
    ]
  },
  {
    id: 'contractors',
    title: 'Contractor Setup',
    description: 'Add third-party service providers, maintenance contractors, and external vendors.',
    icon: <Shield className="w-5 h-5" />,
    estimatedTime: '10-15 minutes',
    importance: 'high',
    href: '/dashboard/assets/contractors',
    benefits: [
      'Automates callout notifications',
      'Tracks contractor performance',
      'Maintains service agreements',
      'Ensures rapid response to equipment failures'
    ],
    tips: [
      'Add emergency contact numbers',
      'Specify service areas and specializations',
      'Upload service agreements and certificates',
      'Set preferred contractors for each asset type'
    ]
  },
  {
    id: 'task-templates',
    title: 'Task Template Configuration',
    description: 'Select, customize, and schedule recurring operational tasks from the template library.',
    icon: <ClipboardCheck className="w-5 h-5" />,
    estimatedTime: '30-45 minutes',
    importance: 'critical',
    href: '/dashboard/my_templates',
    benefits: [
      'Automates daily compliance activities',
      'Ensures consistent operational standards',
      'Creates historical compliance records',
      'Reduces manual scheduling overhead'
    ],
    tips: [
      'Start with food safety tasks (temperature checks, FIFO)',
      'Configure dayparts to match your operations',
      'Assign tasks to roles, not individuals',
      'Test schedules before full deployment'
    ]
  },
  {
    id: 'sops',
    title: 'Standard Operating Procedures',
    description: 'Upload or create SOPs for all critical operational processes.',
    icon: <FileText className="w-5 h-5" />,
    estimatedTime: '1-2 hours',
    importance: 'high',
    href: '/dashboard/sops/templates',
    benefits: [
      'Standardizes training and onboarding',
      'Ensures operational consistency',
      'Provides reference documentation for staff',
      'Supports compliance audits'
    ],
    tips: [
      'Use the template library for common procedures',
      'Include photos and diagrams where helpful',
      'Link SOPs to related tasks',
      'Review and update quarterly'
    ]
  },
  {
    id: 'compliance-tasks',
    title: 'Set up Compliance Tasks',
    description: 'Configure compliance task templates for EHO requirements, food safety, and health & safety regulations.',
    icon: <Shield className="w-5 h-5" />,
    estimatedTime: '20-30 minutes',
    importance: 'critical',
    href: '/dashboard/tasks/compliance',
    benefits: [
      'Ensures EHO compliance and regulatory adherence',
      'Creates automated compliance task schedules',
      'Provides pre-built templates for common requirements',
      'Maintains comprehensive audit trails'
    ],
    tips: [
      'Start with critical food safety compliance tasks',
      'Review and customize templates for your operations',
      'Assign tasks to appropriate roles and sites',
      'Schedule tasks according to regulatory frequencies'
    ]
  }
];

export default function OnboardingPage() {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggleStep = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-theme-surface-elevated0/20 text-theme-tertiary border-gray-500/30';
    }
  };

  return (
    <>
      {/* Single DarkVeil Background Container */}
      <div className="relative">
        {/* Single DarkVeil Background - covers entire page */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-full min-h-screen">
            <DarkVeil />
          </div>
        </div>

        {/* HERO */}
        <section className="relative text-center pt-6 pb-8 sm:pb-10 md:pt-8 md:pb-12 min-h-[350px] sm:min-h-[400px] flex flex-col justify-start">
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8">
            {/* Back to Dashboard Button */}
            <div className="flex justify-start mb-4">
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-theme-tertiary hover:text-magenta-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>

            <h1 className="hero-title text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold leading-[1.4] bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent mb-8 sm:mb-12 pb-3 overflow-visible px-2">
              Setting Up Your Opsly Platform
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-checkly-gray max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed pt-2 px-4">
              A comprehensive guide to configuring Opsly for maximum compliance, efficiency, and operational excellence. 
              Proper setup is the foundation of a successful deployment.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-0 px-4 relative z-10">
              <Link href="/dashboard/business" className="inline-block">
                <Button variant="primary">Start Setup Now</Button>
              </Link>
              <Link href="/contact" className="inline-block">
                <Button variant="primary">Schedule Onboarding Call</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* WHY SETUP MATTERS */}
        <section className="relative px-4 sm:px-6 -mt-12 sm:-mt-16 md:-mt-24 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-theme-primary px-2 sm:px-4">
                Why Proper Setup is Critical
              </h2>
              <p className="text-theme-tertiary max-w-3xl mx-auto px-2 sm:px-4">
                The difference between a good system and a great system is in the setup. 
                Here's what you unlock with proper configuration:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(211, 126, 145,0.35)] transition">
                <h3 className="text-xl font-semibold text-theme-primary mb-2">Accurate Compliance Tracking</h3>
                <p className="text-theme-tertiary">
                  Proper setup ensures every task, temperature reading, and incident is correctly attributed to the right site, asset, and team member, creating a bulletproof audit trail.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-blue-400/50 hover:shadow-module-glow transition">
                <h3 className="text-xl font-semibold text-theme-primary mb-2">Time Savings from Day One</h3>
                <p className="text-theme-tertiary">
                  Automated task generation, smart scheduling, and role-based assignments eliminate hours of manual planning each week, letting your team focus on operations.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(211, 126, 145,0.35)] transition">
                <h3 className="text-xl font-semibold text-theme-primary mb-2">Immediate ROI</h3>
                <p className="text-theme-tertiary">
                  Complete setup unlocks the full power of Opsly: automated compliance, real-time alerts, comprehensive reporting, and data-driven insights that improve operations.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-blue-400/50 hover:shadow-module-glow transition">
                <h3 className="text-xl font-semibold text-theme-primary mb-2">Scalable Foundation</h3>
                <p className="text-theme-tertiary">
                  A well-configured system grows with your business. Add new sites, users, and processes seamlessly without disrupting existing operations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SETUP STEPS */}
        <section className="relative px-4 sm:px-6 py-8 sm:py-12 text-gray-200">
          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-theme-primary px-2 sm:px-4">
                Step-by-Step Setup Guide
              </h2>
              <p className="text-theme-tertiary max-w-3xl mx-auto px-2 sm:px-4">
                Follow these steps in order for the smoothest onboarding experience. 
                Each step builds on the previous one to create a comprehensive compliance system.
              </p>
            </div>

            <div className="space-y-4">
              {setupSteps.map((step, index) => (
                <div 
                  key={step.id}
                  className="rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/20 hover:border-magenta-400/50 transition overflow-hidden"
                >
                  {/* Step Header - Clickable */}
                  <div className="relative">
                    <Link
                      href={step.href}
                      className="block p-4 sm:p-6"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Step Number */}
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-magenta-400/20 flex items-center justify-center text-magenta-400 font-bold text-sm sm:text-base border border-magenta-400/30">
                          {index + 1}
                        </div>

                        {/* Icon */}
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 flex items-center justify-center text-magenta-400">
                          {step.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-theme-primary">
                              {step.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border uppercase ${getImportanceBadge(step.importance)}`}>
                              {step.importance}
                            </span>
                          </div>
                          <p className="text-sm text-theme-tertiary mb-1">
                            {step.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-theme-tertiary">
                            <Clock className="w-3 h-3" />
                            <span>{step.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Expand Button - Positioned absolutely to prevent navigation */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleStep(step.id);
                      }}
                      className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 text-theme-tertiary hover:text-white transition-colors z-10"
                      aria-label={expandedStep === step.id ? "Collapse details" : "Expand details"}
                    >
                      {expandedStep === step.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {expandedStep === step.id && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-white/5 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
                      {/* Benefits */}
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold text-theme-primary mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                          Benefits
                        </h4>
                        <ul className="space-y-2">
                          {step.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-theme-tertiary">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tips */}
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold text-theme-primary mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                          Pro Tips
                        </h4>
                        <ul className="space-y-2">
                          {step.tips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-theme-tertiary">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Go to Page Button */}
                      <div className="pt-2 relative z-10">
                        <Link href={step.href} className="block">
                          <Button variant="primary" fullWidth>
                            Go to {step.title}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-8 sm:py-10 pb-10 sm:pb-14">
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-theme-primary px-2 sm:px-4">
              Ready to Get Started?
            </h2>
            <p className="text-theme-tertiary mb-6 sm:mb-8 max-w-xl mx-auto px-2 sm:px-4 text-sm sm:text-base">
              Our onboarding team is here to help you every step of the way. 
              Schedule a personalized setup session or dive in on your own.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-2 sm:px-4 relative z-10">
              <Link href="/dashboard/business" className="inline-block">
                <Button variant="primary">Begin Setup Process</Button>
              </Link>
              <Link href="/contact" className="inline-block">
                <Button variant="primary">Talk to Our Team</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* HELP SECTION */}
        <section className="relative px-4 sm:px-6 pb-10 sm:pb-14">
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="rounded-2xl bg-blue-500/10 backdrop-blur-md p-6 border border-blue-500/20">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-theme-primary mb-2">
                    Need Help?
                  </h3>
                  <p className="text-sm sm:text-base text-theme-tertiary mb-3">
                    Our support team is available to assist with your setup. We offer personalized onboarding sessions, 
                    video tutorials, and comprehensive documentation to ensure your success.
                  </p>
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                    <a href="mailto:hello@opslytech.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                      hello@opslytech.com
                    </a>
                    <span className="text-theme-secondary">•</span>
                    <a href="tel:+441234567890" className="text-blue-400 hover:text-blue-300 transition-colors">
                      +44 (0) 123 456 7890
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

