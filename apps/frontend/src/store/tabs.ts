import { create } from 'zustand';

export type Tab = { id: string; label: string; path: string };

type TabsState = {
  tabs: Tab[];
  activeId: string | null;
  addTab: (tab: Tab) => void;
  setActive: (id: string) => void;
  closeTab: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
};

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeId: null,

  addTab: (tab) =>
    set((state) => {
      const exists = state.tabs.find((t) => t.id === tab.id);
      if (exists) {
        return { activeId: tab.id };
      }
      return {
        tabs: [...state.tabs, tab],
        activeId: tab.id,
      };
    }),

  setActive: (id) => set({ activeId: id }),

  closeTab: (id) =>
    set((state) => {
      const next = state.tabs.filter((t) => t.id !== id);
      const nextActive =
        state.activeId === id
          ? next.length
            ? next[next.length - 1].id
            : null
          : state.activeId;
      return { tabs: next, activeId: nextActive };
    }),

  closeOthers: (id) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id === id),
      activeId: id,
    })),

  closeAll: () => set({ tabs: [], activeId: null }),
}));
