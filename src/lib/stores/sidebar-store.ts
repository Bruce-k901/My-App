import { create } from 'zustand'

type SidebarMode = 'collapsed' | 'expanded';

interface SidebarStore {
  /** Session-level pin override (null = use user preference) */
  pinOverride: SidebarMode | null
  setPinOverride: (mode: SidebarMode | null) => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  pinOverride: null,
  setPinOverride: (mode) => set({ pinOverride: mode }),
}))
