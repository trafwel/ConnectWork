/**
 * Oct 18 — a person's profile picture on their card: shows it (with their group color as a ring,
 * like the map), lets the user add or change it from a file, or remove it.
 *
 * The file never leaves the browser: it's center-cropped and shrunk to 160 px on a canvas and
 * stored on the person as a small JPEG data: URL (~10 KB), so it travels with backups and needs
 * no server. isSafePhoto (shared) is the same check the map and backup import use.
 */
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { isSafePhoto, type Person } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { updatePerson } from '@/db/actions';
import { initials } from '@/lib/people';

const SIZE = 160;

async function toSmallJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function PhotoField({ person, color }: { person: Person; color: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const photo = isSafePhoto(person.photo) ? person.photo : undefined;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await toSmallJpeg(file);
      if (!isSafePhoto(url)) throw new Error('That image could not be used');
      await updatePerson(person.id, { photo: url });
    } catch {
      toast.error('Couldn’t read that image. Try a JPEG or PNG.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = ''; // picking the same file again still fires
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-semibold" style={{ boxShadow: `0 0 0 2.5px ${color}` }}>
        {photo ? <img src={photo} alt="" className="size-full object-cover" /> : <span aria-hidden="true">{initials(person.name)}</span>}
      </span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Photo for ${person.name}`} onChange={(e) => void pick(e.target.files?.[0])} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Adding…' : photo ? 'Change photo' : 'Add photo'}
      </Button>
      {photo && (
        <Button size="sm" variant="ghost" onClick={() => void updatePerson(person.id, { photo: undefined })}>
          Remove
        </Button>
      )}
    </div>
  );
}
