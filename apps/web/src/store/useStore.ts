import { create } from 'zustand';

export type Filter = 'all' | 'due' | 'drifting' | (string & {});
export type RightPanel = null | 'person' | 'weekly' | 'review' | 'meeting';

interface UIState {
  view: 'map' | 'list';
  filter: Filter;
  selectedPersonId: string | null;
  highlightIds: Set<string>;
  rightPanel: RightPanel;
  agentAnswer: string | null;
  agentBusy: boolean;
  quickAddOpen: boolean;
  importOpen: boolean;
  settingsOpen: boolean;

  setView: (view: 'map' | 'list') => void;
  setFilter: (filter: Filter) => void;
  selectPerson: (id: string | null) => void;
  setHighlights: (ids: Iterable<string>) => void;
  clearFocus: () => void;
  setAgent: (patch: Partial<Pick<UIState, 'agentAnswer' | 'agentBusy'>>) => void;
  setDialog: (dialog: 'quickAdd' | 'import' | 'settings', open: boolean) => void;
}

export const useStore = create<UIState>((set) => ({
  view: 'map',
  filter: 'all',
  selectedPersonId: null,
  highlightIds: new Set(),
  rightPanel: null,
  agentAnswer: null,
  agentBusy: false,
  quickAddOpen: false,
  importOpen: false,
  settingsOpen: false,

  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  selectPerson: (id) => set({ selectedPersonId: id, rightPanel: id ? 'person' : null }),
  setHighlights: (ids) => set({ highlightIds: new Set(ids) }),
  clearFocus: () => set({ selectedPersonId: null, rightPanel: null, highlightIds: new Set(), agentAnswer: null }),
  setAgent: (patch) => set(patch),
  setDialog: (dialog, open) =>
    set(dialog === 'quickAdd' ? { quickAddOpen: open } : dialog === 'import' ? { importOpen: open } : { settingsOpen: open }),
}));
