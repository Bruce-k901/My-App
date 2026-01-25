import { create } from 'zustand'

interface PanelStore {
  messagingOpen: boolean
  calendarOpen: boolean
  setMessagingOpen: (open: boolean) => void
  setCalendarOpen: (open: boolean) => void
}

export const usePanelStore = create<PanelStore>((set) => ({
  messagingOpen: false,
  calendarOpen: false,
  setMessagingOpen: (open) => set({ messagingOpen: open }),
  setCalendarOpen: (open) => set({ calendarOpen: open }),
}))
