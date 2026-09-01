import { describe, it, expect } from 'vitest';
import {
  SETTINGS_SECTIONS,
  shouldShowSettingsStartHere,
  getSettingsNavSections,
  SETTINGS_ADVANCED_SECTION_IDS,
} from '@/shared/settingsCatalog';

describe('settings progressive disclosure helpers', () => {
  it('shows Start here when firstInscriptionComplete is false or undefined', () => {
    expect(shouldShowSettingsStartHere(false)).toBe(true);
    expect(shouldShowSettingsStartHere(undefined)).toBe(true);
  });

  it('hides Start here after first inscription', () => {
    expect(shouldShowSettingsStartHere(true)).toBe(false);
  });

  it('keeps full catalog available in nav regardless of inscription state', () => {
    expect(getSettingsNavSections(false)).toEqual(SETTINGS_SECTIONS);
    expect(getSettingsNavSections(true)).toEqual(SETTINGS_SECTIONS);
    expect(SETTINGS_ADVANCED_SECTION_IDS.length).toBe(SETTINGS_SECTIONS.length);
  });
});
