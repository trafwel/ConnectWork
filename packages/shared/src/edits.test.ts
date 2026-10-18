import { describe, expect, it } from 'vitest';
import { cleanEdits } from './edits';
import type { NetworkEdit } from './schemas';

const known = new Set(['a', 'b', 'c']);
const e = (edit: Partial<NetworkEdit> & Pick<NetworkEdit, 'op'>): NetworkEdit => ({ personIds: [], ...edit });

describe('cleanEdits (Oct 18 search-bar edits)', () => {
  it('keeps well-formed edits about people who exist', () => {
    const edits = [e({ op: 'add_link', personIds: ['a', 'b'] }), e({ op: 'set_ring', personIds: ['c'], ring: 1 }), e({ op: 'remove_suggested_links' })];
    expect(cleanEdits(edits, known)).toEqual(edits);
  });
  it('drops invented people and edits missing what their op needs', () => {
    expect(
      cleanEdits(
        [
          e({ op: 'add_link', personIds: ['a', 'ghost'] }),
          e({ op: 'remove_link', personIds: ['a'] }),
          e({ op: 'set_ring', personIds: ['a'] }),
          e({ op: 'set_tag', personIds: ['a'] }),
          e({ op: 'add_person' }),
          e({ op: 'remove_person', personIds: ['a', 'b'] }),
          e({ op: 'add_link', personIds: ['a', 'a'] }),
        ],
        known,
      ),
    ).toEqual([]);
  });
  it('treats a pair in either order, or the same change twice, as one change', () => {
    expect(cleanEdits([e({ op: 'add_link', personIds: ['a', 'b'] }), e({ op: 'add_link', personIds: ['b', 'a'] })], known)).toHaveLength(1);
  });
});
