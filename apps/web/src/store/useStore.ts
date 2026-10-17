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

/** One AI proposal the user can accept or reject (M6 sort/links, M9 snap). */
export interface ReviewItem {
  id: string;
  title: string;
  detail?: string;
  /** People this proposal is about; highlighted while the row is hovered. */
  personIds: string[];
  /** Default true. false for rows that probably shouldn't be applied (e.g. duplicates). */
  checked?: boolean;
}

export interface ReviewPayload {
  heading: string;
  /** One line under the heading, e.g. what the AI looked at. */
  description?: string;
  items: ReviewItem[];
  /** Writes the accepted rows. Rejected rows are passed too, for cleanup (e.g. removing suggested links). */
  onAccept: (acceptedIds: string[], rejectedIds: string[]) => Promise<void>;
  /** Called when the review is dismissed without accepting (cleanup). */
  onDismiss?: () => Promise<void>;
}

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
  reviewPayload: ReviewPayload | null;

  setView: (view: 'map' | 'list') => void;
  setFilter: (filter: Filter) => void;
  selectPerson: (id: string | null) => void;
  setHighlights: (ids: Iterable<string>) => void;
  clearFocus: () => void;
  setAgent: (patch: Partial<Pick<UIState, 'agentAnswer' | 'agentBusy' | 'agentError'>>) => void;
  setDialog: (dialog: 'quickAdd' | 'import' | 'settings', open: boolean) => void;
  openReview: (payload: ReviewPayload) => void;
  closeReview: () => void;
}

export const useStore = create<UIState>((set, get) => ({
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
  reviewPayload: null,

  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  // Closing a person card returns to an open review instead of an empty panel.
  selectPerson: (id) => set({ selectedPersonId: id, rightPanel: id ? 'person' : get().reviewPayload ? 'review' : null }),
  setHighlights: (ids) => set({ highlightIds: new Set(ids) }),
  // Clicking empty map space clears selection but keeps an open review on screen.
  clearFocus: () =>
    set({
      selectedPersonId: null,
      rightPanel: get().reviewPayload ? 'review' : null,
      highlightIds: new Set(),
      agentAnswer: null,
      agentError: false,
      filter: 'all',
    }),
  setAgent: (patch) => set(patch),
  setDialog: (dialog, open) =>
    set(dialog === 'quickAdd' ? { quickAddOpen: open } : dialog === 'import' ? { importOpen: open } : { settingsOpen: open }),
  openReview: (payload) => set({ reviewPayload: payload, rightPanel: 'review', selectedPersonId: null }),
  closeReview: () => set({ reviewPayload: null, rightPanel: null, highlightIds: new Set() }),
}));
