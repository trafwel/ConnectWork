/**
 * M1 — UI state (Zustand) · done through M6 (extended by later milestones)
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
 *   1. `import { create } from 'zustand';
import type { Candidate, WeeklyReviewResponse } from '@connectwork/shared';` then
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
import type { Candidate, WeeklyReviewResponse } from '@connectwork/shared';

// M6. One suggestion in the review sheet, and the whole review.
export interface ReviewItem {
  id: string;
  title: string;
  detail?: string;
  /** Who this suggestion is about: highlighted on the map while the row is hovered or focused. */
  personIds: string[];
  checked?: boolean;
}
export interface ReviewPayload {
  heading: string;
  /** Extra context shown under the heading, e.g. who got no suggestion (M6-O1). */
  note?: string;
  items: ReviewItem[];
  onAccept: (ids: string[]) => Promise<void>;
  /** Undo anything shown before the decision (e.g. dashed suggested links). Dismiss must change nothing. */
  onDismiss?: () => Promise<void>;
}

/** M8. The weekly plan is kept here so reopening the panel doesn't call Gemini again. */
export interface WeeklyState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  plan?: WeeklyReviewResponse;
  candidates?: Candidate[];
  message?: string;
  /** Indexes of approved actions. */
  done: number[];
}

export type Filter = 'all' | 'due' | 'drifting' | (string & {});
export type RightPanel = null | 'person' | 'weekly' | 'review' | 'meeting';

export interface UIState {
  /** Groups view (Oct 18): the map with each tag collapsed into one node. */
  view: 'map' | 'groups' | 'list' | 'month';
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
  snapOpen: boolean;
  reviewPayload: ReviewPayload | null;
  weeklyOpen: boolean;
  weekly: WeeklyState;
  /** Fix step 2: "Move people" edit mode on the map (drag or 1/2/3 to change ring). */
  editRings: boolean;
  /** M11: the meeting whose prep card is open. */
  selectedMeetingId: string | null;
  /** M11: Google Calendar connected (the token itself lives only in lib/googleCalendar.ts). */
  calendarConnected: boolean;

  setView: (view: 'map' | 'groups' | 'list' | 'month') => void;
  /** Groups view: tags the user opened. Kept while switching views. */
  expandedGroups: Set<string>;
  toggleGroup: (tag: string) => void;
  collapseGroups: () => void;
  /** Polish (Oct 18): "Back" — close the most recently opened group. */
  collapseLastGroup: () => void;
  setFilter: (filter: Filter) => void;
  selectPerson: (id: string | null) => void;
  setHighlights: (ids: Iterable<string>) => void;
  clearFocus: () => void;
  setAgent: (patch: Partial<Pick<UIState, 'agentAnswer' | 'agentBusy' | 'agentError' | 'agentChecked'>>) => void;
  setDialog: (dialog: 'quickAdd' | 'import' | 'settings' | 'snap', open: boolean) => void;
  openReview: (payload: ReviewPayload) => void;
  closeReview: () => void;
  setWeeklyOpen: (open: boolean) => void;
  setWeekly: (patch: Partial<WeeklyState>) => void;
  setEditRings: (on: boolean) => void;
  openMeeting: (id: string, attendeeIds: string[]) => void;
  setCalendarConnected: (on: boolean) => void;
}

// What clearFocus() resets. Kept in one place so the initial state and "clear" can't drift apart.
const noFocus = {
  selectedPersonId: null,
  highlightIds: new Set<string>(),
  rightPanel: null,
  selectedMeetingId: null,
  agentAnswer: null,
  agentError: false,
  agentChecked: false,
  filter: 'all',
} satisfies Partial<UIState>;

const DIALOG_FLAG = { quickAdd: 'quickAddOpen', import: 'importOpen', settings: 'settingsOpen', snap: 'snapOpen' } as const;

export const useStore = create<UIState>((set, get) => ({
  view: 'map',
  ...noFocus,
  agentBusy: false,
  quickAddOpen: false,
  importOpen: false,
  settingsOpen: false,
  snapOpen: false,
  reviewPayload: null,
  weeklyOpen: false,
  weekly: { status: 'idle', done: [] },
  editRings: false,
  calendarConnected: false,
  expandedGroups: new Set<string>(),

  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  // Closing a person card returns to an open review instead of losing it.
  // M11: …and to an open meeting prep card (clicking an attendee, then closing, goes back to the brief).
  selectPerson: (id) =>
    set({ selectedPersonId: id, rightPanel: id ? 'person' : get().reviewPayload ? 'review' : get().selectedMeetingId ? 'meeting' : null }),
  // A new Set every time: Zustand compares by reference, so mutating the old Set would not re-render.
  setHighlights: (ids) => set({ highlightIds: new Set(ids) }),
  clearFocus: () => set({ ...noFocus, highlightIds: new Set<string>(), rightPanel: get().reviewPayload ? 'review' : null }),
  setAgent: (patch) => set(patch),
  setDialog: (dialog, open) => set({ [DIALOG_FLAG[dialog]]: open }),
  setEditRings: (on) => set({ editRings: on }),
  // M11: a meeting highlights its attendees (map and list) and opens its prep card.
  openMeeting: (id, attendeeIds) =>
    set({ selectedMeetingId: id, selectedPersonId: null, rightPanel: 'meeting', highlightIds: new Set(attendeeIds), weeklyOpen: false }),
  setCalendarConnected: (on) => set({ calendarConnected: on }),
  // A new Set each time (Zustand compares by reference).
  toggleGroup: (tag) => {
    const next = new Set(get().expandedGroups);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    set({ expandedGroups: next });
  },
  collapseGroups: () => set({ expandedGroups: new Set<string>() }),
  // Sets keep insertion order, so the last item is the group opened most recently.
  collapseLastGroup: () => {
    const open = [...get().expandedGroups];
    set({ expandedGroups: new Set(open.slice(0, -1)) });
  },
  openReview: (payload) => set({ reviewPayload: payload, rightPanel: 'review', selectedPersonId: null }),
  closeReview: () => set({ reviewPayload: null, rightPanel: get().selectedPersonId ? 'person' : null, highlightIds: new Set<string>() }),
  // M8. The panel shows whenever it's open and no review or person card is in front of it.
  setWeeklyOpen: (open) => set({ weeklyOpen: open, ...(open ? { selectedPersonId: null } : {}) }),
  setWeekly: (patch) => set({ weekly: { ...get().weekly, ...patch } }),
}));
