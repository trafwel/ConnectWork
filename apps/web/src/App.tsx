import { useEffect, useState } from 'react';

type Health = { ok: boolean; model: string; tier: string; cache: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="flex h-screen items-center justify-center bg-slate-50 text-slate-900">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Connectwork</h1>
        <p className="mt-2 text-slate-600">Let Connectwork connect your world.</p>
        <p className="mt-6 text-sm" aria-live="polite">
          {error ? 'Server unreachable' : health ? `Server ok · ${health.model} · ${health.tier} tier` : 'Checking server…'}
        </p>
      </div>
    </main>
  );
}
