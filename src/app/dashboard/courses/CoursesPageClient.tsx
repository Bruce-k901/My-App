'use client';

import Link from "next/link";
import { useState, useMemo } from "react";
import { COURSES } from "@/lib/navigation-constants";
import type { Course } from "@/lib/navigation-constants";
import {
  UtensilsCrossed, ShieldAlert, ClipboardCheck, ListChecks,
  Construction as HardHat, Flame, Package, FlaskConical, Stethoscope, Heart,
  Search, BookOpen, Clock, ChevronRight, GraduationCap, Layers
} from "@/components/ui/icons";

// Map icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed, ShieldAlert, ClipboardCheck, ListChecks,
  HardHat, Flame, Package, FlaskConical, Stethoscope, Heart,
};

// Category definitions
const CATEGORIES = [
  { id: 'all', label: 'All Courses', icon: Layers },
  { id: 'food-hygiene', label: 'Food & Hygiene', icon: UtensilsCrossed },
  { id: 'workplace-safety', label: 'Workplace Safety', icon: HardHat },
  { id: 'people', label: 'People', icon: Heart },
] as const;

function getCourseIcon(iconName?: string) {
  if (!iconName) return BookOpen;
  return ICON_MAP[iconName] || BookOpen;
}

function CourseCard({ course }: { course: Course }) {
  const IconComponent = getCourseIcon(course.icon);

  return (
    <Link
      href={course.href}
      className="group relative flex flex-col rounded-2xl border border-theme bg-theme-surface overflow-hidden transition-all duration-300 hover:border-[#D37E91]/40 hover:shadow-[0_8px_40px_rgba(211,126,145,0.1)] hover:-translate-y-0.5"
    >
      {/* Icon header */}
      <div className="relative h-24 bg-theme-surface-elevated flex items-center justify-center overflow-hidden border-b border-theme">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#D37E91]/10">
          <IconComponent className="h-6 w-6 text-[#D37E91]" />
        </div>
        {course.badge && (
          <span className="absolute top-3 right-3 rounded-full bg-[#D37E91]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D37E91]">
            {course.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 pt-4">
        <h3 className="text-[15px] font-semibold text-[rgb(var(--text-primary))] group-hover:text-[#D37E91] transition-colors leading-snug mb-1.5">
          {course.title}
        </h3>

        <p className="text-xs text-[rgb(var(--text-tertiary))] mb-3">
          {course.level}
        </p>

        <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed line-clamp-2 mb-4 flex-1">
          {course.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-theme">
          <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-tertiary))]">
            <Clock className="h-3.5 w-3.5" />
            {course.duration}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#D37E91] group-hover:gap-2 transition-all">
            Start Course
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CoursesPageClient() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    let courses = COURSES;

    // Filter by category
    if (activeCategory !== 'all') {
      courses = courses.filter(c => c.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      courses = courses.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      );
    }

    return courses;
  }, [activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: COURSES.length };
    COURSES.forEach(c => {
      const cat = c.category || 'compliance';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Search + Category Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => {
            const CatIcon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#D37E91] text-white shadow-sm'
                    : 'bg-theme-muted text-[rgb(var(--text-secondary))] hover:bg-theme-hover'
                }`}
              >
                <CatIcon className="h-3.5 w-3.5" />
                {cat.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? 'bg-white/20' : 'bg-theme-surface'
                }`}>
                  {categoryCounts[cat.id] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--text-tertiary))]" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-theme bg-theme-surface py-2 pl-9 pr-4 text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] focus:border-[#D37E91] focus:outline-none focus:ring-1 focus:ring-[#D37E91]"
          />
        </div>
      </div>

      {/* Course grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map(course => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-[rgb(var(--text-tertiary))] mb-3" />
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            No courses match your search.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            className="mt-2 text-xs text-[#D37E91] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
