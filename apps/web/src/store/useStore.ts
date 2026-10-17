/**
 * M1 — UI state (Zustand) · done for M1 (extended by later milestones)
 *
 * WHAT THIS ACHIEVES
 *   One small store for what the UI is doing — which person is selected, what is
 *   highlighted, which filter and dialogs are open, the agent's answer — shared by
 *   every component without passing props down through layers.
 *
 * HOW IT FITS
 *   Data (people, links…) is NOT stored here: it lives in Dexie and components read
 *   it with useLiveQuery. Components select single fields:
 *     const selectedId = useStore((s) => s.selectedPersonId);
 *
 * STEPS
 *   1. `import { create } from 'zustand';` then
 *        export const useStore = create<UIState>((set, get) => ({ …initial state…, …actions… }))
 *      Initial state: view 'map', filter 'all', selectedPersonId null, highlightIds
 *      new Set(), rightPanel null, agentAnswer null, agentError false, agentBusy false,
 *      all dialog flags false (and reviewPayload null from M6).
 *   2. Actions:
 *        setView(view) / setFilter(filter)       → set({ view }) / set({ filter })
 *        selectPerson(id)   → set({ selectedPersonId: id, rightPanel: id ? 'person' : null })
 *                             (M6: when id is null and a review is open, go back to 'review')
 *        setHighlights(ids) → set({ highlightIds: new Set(ids) })   (a Set: O(1) lookups per node)
 *        clearFocus()       → clear selection, highlights, agent answer/error and reset filter to 'all'
 *        setAgent(patch)    → set(patch)
 *        setDialog(dialog, open) → set the matching quickAddOpen / importOpen / settingsOpen flag
 *   3. M6 adds ReviewItem / ReviewPayload types plus openReview(payload) and closeReview()
 *      (see components/ReviewSheet.tsx). M8 adds 'weekly', M9 a 'snap' dialog, M11 a meeting id.
 *
 * DONE WHEN
 *   - Clicking a node (M2) selects it and the card opens; Escape/empty-click clears it.
 *
 * Shared file: tell your teammate before editing it. Guide: §5.5
 */
import { create } from 'zustand';

export type Filter = 'all' | 'due' | 'drifting' | (string & {});
export type RightPanel = null | 'person' | 'weekly' | 'review' | 'meeting';

export interface UIState {
  view: 'map' | 'list';
  filter: Filter;
  selectedPersonId: string | null;
  highlightIds: Set<string>;
  rightPanel: RightPanel;
  agentAnswer: string | null;
  agentError: boolean;
  agentBusy: boolean;
  /** Code changed the model's list (grounding, exact matches, drift rule): say so on the card (M5-O2). */
  agentChecked: boolean;
  quickAddOpen: boolean;
  importOpen: boolean;
  settingsOpen: boolean;

  setView: (view: 'map' | 'list') => void;
  setFilter: (filter: Filter) => void;
  selectPerson: (id: string | null) => void;
  setHighlights: (ids: Iterable<string>) => void;
  clearFocus: () => void;
  setAgent: (patch: Partial<Pick<UIState, 'agentAnswer' | 'agentBusy' | 'agentError' | 'agentChecked'>>) => void;
  setDialog: (dialog: 'quickAdd' | 'import' | 'settings', open: boolean) => void;
}

// What clearFocus() resets. Kept in one place so the initial state and "clear" can't drift apart.
const noFocus = {
  selectedPersonId: null,
  highlightIds: new Set<string>(),
  rightPanel: null,
  agentAnswer: null,
  agentError: false,
  agentChecked: false,
  filter: 'all',
} satisfies Partial<UIState>;

const DIALOG_FLAG = { quickAdd: 'quickAddOpen', import: 'importOpen', settings: 'settingsOpen' } as const;

export const useStore = create<UIState>((set) => ({
  view: 'map',
  ...noFocus,
  agentBusy: false,
  quickAddOpen: false,
  importOpen: false,
  settingsOpen: false,

  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  selectPerson: (id) => set({ selectedPersonId: id, rightPanel: id ? 'person' : null }),
  // A new Set every time: Zustand compares by reference, so mutating the old Set would not re-render.
  setHighlights: (ids) => set({ highlightIds: new Set(ids) }),
  clearFocus: () => set({ ...noFocus, highlightIds: new Set<string>() }),
  setAgent: (patch) => set(patch),
  setDialog: (dialog, open) => set({ [DIALOG_FLAG[dialog]]: open }),
}));
