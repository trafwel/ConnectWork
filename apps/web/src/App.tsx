import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Toaster } from '@/components/ui/sonner';
import { TopBar } from '@/components/TopBar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { db } from '@/db/db';
import { ensureSeeded } from '@/db/seed';

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureSeeded().then(() => setReady(true));
  }, []);

  const counts = useLiveQuery(async () => ({
    people: await db.people.count(),
    links: await db.links.count(),
    reminders: await db.reminders.count(),
  }));

  return (
    <div className="flex h-screen flex-col bg-muted/30 text-foreground">
      <TopBar />
      <main className="flex flex-1 items-center justify-center">
        {!ready || !counts ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <p className="text-muted-foreground" data-testid="counts">
            {counts.people} people · {counts.links} links · {counts.reminders} reminders
          </p>
        )}
      </main>
      <SettingsDialog />
      <Toaster position="bottom-center" />
    </div>
  );
}
