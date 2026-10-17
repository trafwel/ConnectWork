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
