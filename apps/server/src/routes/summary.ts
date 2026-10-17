/** Person ids present in a graph summary ("P|id|..." lines). Used by route guardrails. */
export function summaryIds(summary: string): Set<string> {
  const ids = new Set<string>();
  for (const line of summary.split('\n')) {
    if (line.startsWith('P|')) {
      const id = line.split('|')[1];
      if (id) ids.add(id);
    }
  }
  return ids;
}
