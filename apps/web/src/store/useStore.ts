/**
 * M1 — UI state (Zustand) · done (extended by later milestones)
 *
 * WHAT THIS ACHIEVES
 *   One small store for what the UI is doing — which person is selected, what is
 *   highlighted, which filter and dialogs are open, the agent's answer — shared by
 *   every component without prop drilling.
 *
 * HOW IT FITS
 *   Data (people, links…) is NOT stored here; it lives in Dexie and is read with
 *   useLiveQuery. Later milestones add reviewPayload (M6), the weekly panel (M8),
 *   the snap dialog (M9) and the selected meeting (M11).
 *
 * HOW IT WAS BUILT
 *   1. selectPerson(id) also opens the right panel; clearFocus() resets selection,
 *      highlights, the agent answer and the filter.
 *   2. highlightIds is a Set so the map checks membership in O(1) per node.
 *
 * Shared file: tell your teammate before editing it. Guide: §5.5
 */
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
  agentError: boolean;
  agentBusy: boolean;
  quickAddOpen: boolean;
  importOpen: boolean;
  settingsOpen: boolean;

  setView: (view: 'map' | 'list') => void;
  setFilter: (filter: Filter) => void;
  selectPerson: (id: string | null) => void;
  setHighlights: (ids: Iterable<string>) => void;
  clearFocus: () => void;
  setAgent: (patch: Partial<Pick<UIState, 'agentAnswer' | 'agentBusy' | 'agentError'>>) => void;
  setDialog: (dialog: 'quickAdd' | 'import' | 'settings', open: boolean) => void;
}

export const useStore = create<UIState>((set) => ({
  view: 'map',
  filter: 'all',
  selectedPersonId: null,
  highlightIds: new Set(),
  rightPanel: null,
  agentAnswer: null,
  agentError: false,
  agentBusy: false,
  quickAddOpen: false,
  importOpen: false,
  settingsOpen: false,

  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  selectPerson: (id) => set({ selectedPersonId: id, rightPanel: id ? 'person' : null }),
  setHighlights: (ids) => set({ highlightIds: new Set(ids) }),
  clearFocus: () =>
    set({ selectedPersonId: null, rightPanel: null, highlightIds: new Set(), agentAnswer: null, agentError: false, filter: 'all' }),
  setAgent: (patch) => set(patch),
  setDialog: (dialog, open) =>
    set(dialog === 'quickAdd' ? { quickAddOpen: open } : dialog === 'import' ? { importOpen: open } : { settingsOpen: open }),
}));
