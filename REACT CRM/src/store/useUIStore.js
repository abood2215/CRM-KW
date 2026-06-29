import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));
