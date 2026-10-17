/**
 * M3 — Quick add (press N) · done
 *
 * WHAT THIS ACHIEVES
 *   Adding a person takes under 10 seconds: name, ring, tag, Enter. Details come
 *   later from the card. Low friction is the point of the Cook Smarter track.
 *
 * HOW IT FITS
 *   Opened by the N hotkey (lib/useHotkey.ts) or the "+ Add" button (store.quickAddOpen);
 *   writes with addPerson (db/actions.ts).
 *
 * STEPS
 *   1. Controlled shadcn Dialog (open={quickAddOpen}); reset the fields when it closes.
 *   2. Focus the Name input on open: pass `initialFocus={nameRef}` to <DialogContent>.
 *      Our dialogs are Base UI, which IGNORES autoFocus — we lost time on this.
 *   3. A <form onSubmit> with: Name (<Label htmlFor> + <Input>), Ring (<RingPicker>, default 2),
 *      Tag (<TagSelect>, default 'Friends'), and a submit button "Add · Enter" disabled
 *      while the name is empty.
 *   4. On submit: preventDefault; addPerson({ name, ring, primaryTag: tag }); close;
 *      toast.success(`Added ${name}`, { action: { label: 'Open card', onClick: () => selectPerson(id) } }).
 *
 * DONE WHEN
 *   - N → type a name → Enter adds a node immediately, in under 10 seconds.
 *
 * Guide: §7.2
 */

import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Ring } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addPerson } from '@/db/actions';
import { useStore } from '@/store/useStore';
import { RingPicker } from './RingPicker';
import { TagSelect } from './TagSelect';

export function QuickAdd() {
  const open = useStore((s) => s.quickAddOpen);
  const setDialog = useStore((s) => s.setDialog);
  const selectPerson = useStore((s) => s.selectPerson);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [ring, setRing] = useState<Ring>(2);
  const [tag, setTag] = useState('Friends');
  const [saving, setSaving] = useState(false);

  const close = () => {
    setDialog('quickAdd', false);
    setName('');
    setRing(2);
    setTag('Friends');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return; // a fast double Enter must not add the person twice
    setSaving(true);
    try {
      const person = await addPerson({ name, ring, primaryTag: tag });
      close();
      toast.success(`Added ${person.name}`, { action: { label: 'Open card', onClick: () => selectPerson(person.id) } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add that person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setDialog('quickAdd', true) : close())}>
      {/* Base UI ignores autoFocus; initialFocus is how the Name field gets focus on open. */}
      <DialogContent className="sm:max-w-md" initialFocus={nameRef}>
        <DialogHeader>
          <DialogTitle>Add someone</DialogTitle>
          <DialogDescription>Name, ring and a tag. Add the rest later from their card.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qa-name">Name</Label>
            <Input id="qa-name" ref={nameRef} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Lee" />
          </div>
          <div className="space-y-1.5">
            <Label>Ring</Label>
            <RingPicker value={ring} onChange={setRing} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-tag">Tag</Label>
            <div>
              <TagSelect id="qa-tag" value={tag} onChange={setTag} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!name.trim() || saving}>
              Add · Enter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
