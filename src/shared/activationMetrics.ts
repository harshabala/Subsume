/**
 * Device-only activation counters (chrome.storage.local).
 * Never uploaded — surface in Settings → Diagnostics for the builder.
 */

export const ACTIVATION_METRICS_KEY = 'subsume_activation_metrics';

export interface ActivationMetrics {
  appOpens: number;
  firstInscriptionAt?: number;
  inscriptionsTotal: number;
  weeklySelectionOpens: number;
}

export const DEFAULT_ACTIVATION_METRICS: ActivationMetrics = {
  appOpens: 0,
  inscriptionsTotal: 0,
  weeklySelectionOpens: 0,
};

/** Normalize partial / legacy stored values into a full metrics object. */
export function normalizeActivationMetrics(
  raw: Partial<ActivationMetrics> | null | undefined,
): ActivationMetrics {
  return {
    appOpens: typeof raw?.appOpens === 'number' && raw.appOpens >= 0 ? raw.appOpens : 0,
    firstInscriptionAt:
      typeof raw?.firstInscriptionAt === 'number' ? raw.firstInscriptionAt : undefined,
    inscriptionsTotal:
      typeof raw?.inscriptionsTotal === 'number' && raw.inscriptionsTotal >= 0
        ? raw.inscriptionsTotal
        : 0,
    weeklySelectionOpens:
      typeof raw?.weeklySelectionOpens === 'number' && raw.weeklySelectionOpens >= 0
        ? raw.weeklySelectionOpens
        : 0,
  };
}

/** Pure: +1 app open. */
export function applyAppOpen(metrics: ActivationMetrics): ActivationMetrics {
  return { ...metrics, appOpens: metrics.appOpens + 1 };
}

/**
 * Pure: +1 inscription. Sets firstInscriptionAt on the first count only.
 */
export function applyInscription(
  metrics: ActivationMetrics,
  at: number = Date.now(),
): ActivationMetrics {
  const nextTotal = metrics.inscriptionsTotal + 1;
  return {
    ...metrics,
    inscriptionsTotal: nextTotal,
    firstInscriptionAt: metrics.firstInscriptionAt ?? at,
  };
}

/** Pure: +1 weekly selection open (user engaged the weekly section). */
export function applyWeeklySelectionOpen(metrics: ActivationMetrics): ActivationMetrics {
  return { ...metrics, weeklySelectionOpens: metrics.weeklySelectionOpens + 1 };
}

function storageAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.storage &&
    !!chrome.storage.local
  );
}

export async function getActivationMetrics(): Promise<ActivationMetrics> {
  if (!storageAvailable()) return { ...DEFAULT_ACTIVATION_METRICS };
  const data = await chrome.storage.local.get(ACTIVATION_METRICS_KEY);
  return normalizeActivationMetrics(
    data[ACTIVATION_METRICS_KEY] as Partial<ActivationMetrics> | undefined,
  );
}

export async function saveActivationMetrics(metrics: ActivationMetrics): Promise<void> {
  if (!storageAvailable()) return;
  await chrome.storage.local.set({ [ACTIVATION_METRICS_KEY]: metrics });
}

export async function incrementAppOpens(): Promise<ActivationMetrics> {
  const current = await getActivationMetrics();
  const next = applyAppOpen(current);
  await saveActivationMetrics(next);
  return next;
}

export async function recordInscription(at: number = Date.now()): Promise<ActivationMetrics> {
  const current = await getActivationMetrics();
  const next = applyInscription(current, at);
  await saveActivationMetrics(next);
  return next;
}

export async function incrementWeeklySelectionOpens(): Promise<ActivationMetrics> {
  const current = await getActivationMetrics();
  const next = applyWeeklySelectionOpen(current);
  await saveActivationMetrics(next);
  return next;
}
