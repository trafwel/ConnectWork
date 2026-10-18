/**
 * M9 — SnapDialog: photo or PDF → people · done
 *
 * WHAT THIS ACHIEVES
 *   The fastest way to add people you met in person: snap the business card,
 *   or drop the club roster, and review who was found. Strong live-demo moment
 *   (hold up a real card to the camera) and our "Best Use of Gemini" story.
 *
 * HOW IT FITS
 *   TopBar "Snap" → this dialog → lib/image.ts → aiPost('/extract') →
 *   dedupe with findMatch (lib/csv.ts) → useStore.openReview(...) →
 *   onAccept → applyImport({ toAdd, toUpdate: [] }, 'snap', tag) (db/actions.ts).
 *
 * STEPS
 *   1. Store: a 'snap' dialog flag (extend setDialog), TopBar "Snap" button (lucide `Camera`).
 *   2. Dialog body: <input type="file" accept="image/*,application/pdf" capture="environment">
 *      (phones open the camera), a thumbnail preview for images, "Reading…" while waiting.
 *      Use initialFocus on the file button (Base UI dialogs ignore autoFocus).
 *   3. Call fileToPayload(file), then aiPost('/extract', { file, tags: PRIMARY_TAGS }, ExtractResponse).
 *   4. For each person: findMatch(existingPeople, draft). Matches become rows with
 *      detail "already in your network" and checked: false.
 *   5. openReview({ heading: `Add N people from ${file.name}`, items, onAccept }) and close the dialog.
 *   6. onAccept: tag = suggestedTag if it's a known tag, else 'Clubs' for multi-person
 *      files and 'Work' for a single card; set lastContact = today (you just met);
 *      applyImport(…, 'snap', tag). (M9 review: the accepted rows go through planImport, so a
 *      ticked "already in your network" row only fills EMPTY fields, like the CSV import.)
 *   App.tsx lazy-loads this dialog: it imports lib/csv.ts, which pulls in Papa Parse.
 *   7. Errors (too big, unreadable, AI busy) → toast.error with the message.
 *
 * DONE WHEN
 *   - demo/roster.pdf → 8 people in the review; a phone photo of a card → 1 person.
 *
 * Guide: §16
 */

import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { ExtractResponse } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { applyImport } from '@/db/actions';
import { db } from '@/db/db';
import { aiPost } from '@/lib/api';
import { PRIMARY_TAGS } from '@/lib/colors';
import { findMatch, planImport, type PersonDraft } from '@/lib/csv';
import { today } from '@/lib/dates';
import { fileToPayload } from '@/lib/image';
import { useStore } from '@/store/useStore';

export function SnapDialog() {
  const open = useStore((s) => s.snapOpen);
  const setDialog = useStore((s) => s.setDialog);
  const openReview = useStore((s) => s.openReview);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The preview is an object URL: release it when it changes or the dialog goes away.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const close = () => {
    setDialog('snap', false);
    setPreview(null);
  };

  // Steps 3–6
  const read = async (file: File) => {
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setBusy(true);
    try {
      const payload = await fileToPayload(file);
      const res = await aiPost('/extract', { file: payload, tags: PRIMARY_TAGS }, ExtractResponse);
      if (!res.ok) throw new Error(res.message);
      const found = res.data.people;
      if (!found.length) {
        toast('No people found in that file');
        return;
      }

      const existing = await db.people.toArray();
      const fallbackTag = found.length > 1 ? 'Clubs' : 'Work';
      const met = today(); // you just met them
      const drafts: PersonDraft[] = found.map((p) => ({
        name: p.name,
        company: p.company,
        role: p.role,
        school: p.school,
        email: p.email,
        linkedinUrl: p.linkedinUrl,
        tags: [p.suggestedTag && PRIMARY_TAGS.includes(p.suggestedTag) ? p.suggestedTag : fallbackTag],
        metAt: met,
      }));
      const matches = drafts.map((d) => findMatch(existing, d));

      // Step 5
      openReview({
        heading: `Add ${found.length} ${found.length === 1 ? 'person' : 'people'} from ${file.name}`,
        items: drafts.map((d, i) => ({
          id: String(i),
          title: [d.name, d.role, d.company ?? d.school].filter(Boolean).join(' · '),
          detail: matches[i] ? `Already in your network as ${matches[i]!.name}: accepting only fills empty fields` : `New · ${d.tags![0]}`,
          personIds: matches[i] ? [matches[i]!.id] : [],
          checked: !matches[i],
        })),
        // Step 6. Same rules as the CSV import: new people are added, matches only get EMPTY fields filled.
        onAccept: async (ids) => {
          const chosen = ids.map(Number).map((i) => drafts[i]!);
          const plan = planImport(await db.people.toArray(), chosen);
          await applyImport(plan, 'snap', fallbackTag);
        },
      });
      close();
    } catch (err) {
      // Step 7
      toast.error(err instanceof Error ? err.message : 'Could not read that file');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setDialog('snap', true) : close())}>
      {/* Base UI ignores autoFocus; initialFocus puts the keyboard on the Choose button. */}
      <DialogContent className="sm:max-w-md" initialFocus={chooseRef}>
        <DialogHeader>
          <DialogTitle>Snap to add</DialogTitle>
          <DialogDescription>
            A photo of a business card, or a club roster or attendee list (photo or PDF). The AI reads it and you choose who to add. Photos are resized first,
            and their location data is removed.
          </DialogDescription>
        </DialogHeader>

        {/* Step 2. capture: phones open the camera straight away. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // so choosing the same file again still works
            if (file) void read(file);
          }}
        />
        <div className="flex flex-col items-center gap-3">
          {preview && <img src={preview} alt="The photo being read" className="max-h-48 rounded-md border object-contain" />}
          <Button ref={chooseRef} disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera /> {busy ? 'Reading…' : 'Choose a photo or PDF'}
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {busy ? 'Reading the file. This can take a few seconds.' : 'Free tier: use sample cards and lists only.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
