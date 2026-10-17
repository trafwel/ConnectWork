/**
 * M3 — Quick add (press N) · done
 *
 * WHAT THIS ACHIEVES
 *   Adding a person takes under 10 seconds: name, ring, tag, Enter. Details come
 *   later from the card. Low friction is the point of the Cook Smarter track.
 *
 * HOW IT FITS
 *   Opened by the N hotkey (lib/useHotkey.ts) or the "+ Add" button; writes with
 *   addPerson; the toast offers "Open card".
 *
 * HOW IT WAS BUILT
 *   1. Base UI dialog with initialFocus on the Name input (autoFocus is ignored).
 *   2. RingPicker (default 2) and TagSelect (default Friends).
 *   3. Submit on Enter; reset fields when closed.
 *
 * DONE WHEN
 *   - N → type a name → Enter adds a node immediately.
 *
 * Guide: §7.2
 */
import { useRef, useState } from 'react';
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

  const reset = () => {
    setName('');
    setRing(2);
    setTag('Friends');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const person = await addPerson({ name, ring, primaryTag: tag });
    reset();
    setDialog('quickAdd', false);
    toast.success(`Added ${person.name}`, { action: { label: 'Open card', onClick: () => selectPerson(person.id) } });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setDialog('quickAdd', o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md" initialFocus={nameRef}>
        <DialogHeader>
          <DialogTitle>Add someone</DialogTitle>
          <DialogDescription>Name, ring and a tag. Add the rest later from their card.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qa-name">Name</Label>
            <Input id="qa-name" ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Lee" />
          </div>
          <div className="space-y-1.5">
            <Label id="qa-ring-label">Ring</Label>
            <RingPicker value={ring} onChange={setRing} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-tag">Tag</Label>
            <div>
              <TagSelect id="qa-tag" value={tag} onChange={setTag} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!name.trim()}>
              Add · Enter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
