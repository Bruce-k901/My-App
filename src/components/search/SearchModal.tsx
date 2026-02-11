"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { usePanelStore } from "@/lib/stores/panel-store";
import { SEARCH_INDEX, type SearchItem } from "@/lib/search-index";
import { useGlobalSearch, type DataSearchResult } from "@/hooks/useGlobalSearch";
import {
  LayoutGrid,
  Building2,
  CheckSquare,
  Warehouse,
  Users,
  Package,
  Factory,
  BookOpen,
  GraduationCap,
  Settings,
  ChefHat,
  Wrench,
  Truck,
  UserCheck,
  Loader2,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  FolderOpen,
} from '@/components/ui/icons';

// Map section names to icons (pages)
const SECTION_ICONS: Record<string, React.ElementType> = {
  General: LayoutGrid,
  Organization: Building2,
  Checkly: CheckSquare,
  Stockly: Warehouse,
  Teamly: Users,
  Planly: Factory,
  Assetly: Package,
  Libraries: BookOpen,
  Courses: GraduationCap,
};

// Map data categories to icons
const DATA_ICONS: Record<string, React.ElementType> = {
  Staff: Users,
  Tasks: ClipboardCheck,
  SOPs: FileText,
  Incidents: AlertTriangle,
  Documents: FolderOpen,
  Recipes: ChefHat,
  "Stock Items": Package,
  Assets: Wrench,
  Suppliers: Truck,
  Customers: UserCheck,
};

const DATA_CATEGORY_ORDER = ["Staff", "Tasks", "SOPs", "Incidents", "Documents", "Recipes", "Stock Items", "Assets", "Suppliers", "Customers"];

// Ordered section display
const SECTION_ORDER = [
  "General",
  "Checkly",
  "Stockly",
  "Teamly",
  "Planly",
  "Assetly",
  "Organization",
  "Libraries",
  "Courses",
];

// Group items by section
function groupBySection(items: SearchItem[]): Record<string, SearchItem[]> {
  const groups: Record<string, SearchItem[]> = {};
  for (const item of items) {
    if (!groups[item.section]) groups[item.section] = [];
    groups[item.section].push(item);
  }
  return groups;
}

// Group data results by category
function groupByCategory(items: DataSearchResult[]): Record<string, DataSearchResult[]> {
  const groups: Record<string, DataSearchResult[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export function SearchModal() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = usePanelStore();
  const [query, setQuery] = useState("");

  // Static page results
  const grouped = useMemo(() => groupBySection(SEARCH_INDEX), []);

  // Live data results
  const { results: dataResults, loading: dataLoading } = useGlobalSearch(query);
  const dataGrouped = useMemo(() => groupByCategory(dataResults), [dataResults]);

  // Register Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  // Reset query when modal closes
  useEffect(() => {
    if (!searchOpen) setQuery("");
  }, [searchOpen]);

  if (!searchOpen) return null;

  const handleSelect = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };

  const hasDataResults = dataResults.length > 0;
  const showDataSection = query.length >= 2;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-start justify-center pt-[15vh]"
      onMouseDown={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl mx-4 animate-in fade-in-0 zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Command
          className="rounded-xl border border-gray-200 dark:border-white/[0.1] shadow-2xl"
          filter={(value, search) => {
            // Data results always pass the filter (they're already filtered server-side)
            if (value.startsWith("data-")) return 1;
            // Static page results: match against label and keywords
            const item = SEARCH_INDEX.find((i) => i.id === value);
            if (!item) return 0;
            const searchLower = search.toLowerCase();
            if (item.label.toLowerCase().includes(searchLower)) return 1;
            if (item.keywords.some((k) => k.toLowerCase().includes(searchLower))) return 0.5;
            return 0;
          }}
        >
          <CommandInput
            autoFocus
            placeholder="Search pages, staff, recipes, stock..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {dataLoading ? (
                <span className="flex items-center justify-center gap-2 text-gray-400 dark:text-white/40">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </span>
              ) : (
                "No results found."
              )}
            </CommandEmpty>

            {/* Live data results (shown first when searching) */}
            {showDataSection && (hasDataResults || dataLoading) && (
              <>
                {DATA_CATEGORY_ORDER.map((category) => {
                  const items = dataGrouped[category];
                  if (!items?.length) return null;
                  const Icon = DATA_ICONS[category] || Settings;
                  return (
                    <CommandGroup
                      key={`data-${category}`}
                      heading={
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          {category}
                        </span>
                      }
                    >
                      {items.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`data-${item.id}`}
                          onSelect={() => handleSelect(item.href)}
                        >
                          <span>{item.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
                {dataLoading && !hasDataResults && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400 dark:text-white/40">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Searching data...
                  </div>
                )}
                <CommandSeparator />
              </>
            )}

            {/* Static page results */}
            {SECTION_ORDER.map((section, idx) => {
              const items = grouped[section];
              if (!items?.length) return null;
              const Icon = SECTION_ICONS[section] || Settings;
              return (
                <div key={section}>
                  {idx > 0 && <CommandSeparator />}
                  <CommandGroup
                    heading={
                      <span className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {section}
                      </span>
                    }
                  >
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item.href)}
                      >
                        <span>{item.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
