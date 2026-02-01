/**
 * @ai-knowledge
 * @title Panel State Management
 * @category State
 * @subcategory Zustand Stores
 * @tags zustand, state-management, panels, messaging, calendar, ai-assistant
 *
 * The panel-store manages the open/closed state of slide-out panels.
 *
 * Managed Panels:
 * - messagingOpen: Controls the messaging/notifications panel
 * - calendarOpen: Controls the calendar side panel
 * - aiAssistantOpen: Controls the AI assistant chat panel
 *
 * Usage:
 * ```tsx
 * import { usePanelStore } from '@/lib/stores/panel-store';
 *
 * // In component:
 * const { aiAssistantOpen, setAiAssistantOpen } = usePanelStore();
 * ```
 *
 * Trigger Locations:
 * - AI Assistant: "Ask AI" button in DashboardHeader
 * - Calendar: Calendar icon in DashboardHeader
 * - Messaging: Bell icon in DashboardHeader
 */

import { create } from 'zustand'

interface PanelStore {
  messagingOpen: boolean
  calendarOpen: boolean
  aiAssistantOpen: boolean
  setMessagingOpen: (open: boolean) => void
  setCalendarOpen: (open: boolean) => void
  setAiAssistantOpen: (open: boolean) => void
}

export const usePanelStore = create<PanelStore>((set) => ({
  messagingOpen: false,
  calendarOpen: false,
  aiAssistantOpen: false,
  setMessagingOpen: (open) => set({ messagingOpen: open }),
  setCalendarOpen: (open) => set({ calendarOpen: open }),
  setAiAssistantOpen: (open) => set({ aiAssistantOpen: open }),
}))
