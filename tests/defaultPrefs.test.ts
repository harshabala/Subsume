import { describe, it, expect } from 'vitest';
import { DEFAULT_PREFS } from '@/background/storage';

describe('DEFAULT_PREFS (new installs)', () => {
  it('enables free weekly selection by default', () => {
    expect(DEFAULT_PREFS.dispatchEnabled).toBe(true);
  });

  it('marks first inscription incomplete by default', () => {
    expect(DEFAULT_PREFS.firstInscriptionComplete).toBe(false);
  });

  it('does not mark onboarding complete by default', () => {
    expect(DEFAULT_PREFS.onboardingComplete).toBe(false);
  });
});
