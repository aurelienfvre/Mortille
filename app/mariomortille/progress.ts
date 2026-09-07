/** Device-local campaign progress; online competitive scores are separate. */
export type CampaignProgress = { version: 1; completed: string[] };
export const progressKey = 'mariomortille-campaign-v1';
export function readProgress(raw: string | null, ids: string[]): CampaignProgress {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version === 1 && Array.isArray(value.completed)) {
      return { version: 1, completed: ids.filter(id => value.completed.includes(id)) };
    }
  } catch { /* A damaged save starts a fresh campaign. */ }
  return { version: 1, completed: [] };
}
export function unlockedThrough(progress: CampaignProgress, ids: string[]): number {
  let index = 0;
  while (index < ids.length - 1 && progress.completed.includes(ids[index])) index++;
  return index;
}
export function completeStage(progress: CampaignProgress, id: string, ids: string[]): CampaignProgress {
  const index = ids.indexOf(id);
  if (index < 0 || index > unlockedThrough(progress, ids) || progress.completed.includes(id)) return progress;
  return { version: 1, completed: [...progress.completed, id] };
}
