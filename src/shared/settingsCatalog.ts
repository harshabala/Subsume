export type SettingsSectionId =
  | 'appearance'
  | 'taste'
  | 'discovery'
  | 'credentials'
  | 'ai'
  | 'browsing'
  | 'data'
  | 'diagnostics';

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  title: string;
  /** Plain-language description shown at top of section */
  description: string;
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: 'appearance',
    title: 'Look & atmosphere',
    description:
      'Theme (dark, light, or system) and colour atmosphere presets. Changes preview immediately; use Save settings at the bottom to keep them.',
  },
  {
    id: 'taste',
    title: 'Taste & platforms',
    description:
      'Favourite genres and streaming platforms shape discovery feeds, weekly digests, and rule-based recommendations. They do not change your private notes.',
  },
  {
    id: 'discovery',
    title: 'Discovery sources',
    description:
      'Which catalogues Subsume can query for search and new releases. Free sources work without keys; TMDb and OMDb deepen metadata when you add keys.',
  },
  {
    id: 'credentials',
    title: 'API keys',
    description:
      'Optional keys stored locally in your browser. TMDb unlocks full poster and cast sync; OMDb adds extra ratings; LLM keys power personalized curation.',
  },
  {
    id: 'ai',
    title: 'AI curator',
    description:
      'Enable your own LLM provider, edit curator instructions, and preview the taste profile JSON sent with each request. Data stays local until you call the API.',
  },
  {
    id: 'browsing',
    title: 'Browsing & overlays',
    description:
      'How Subsume behaves on streaming and review sites: hover cards, poster badges, reflection dock, and sites where overlays are turned off.',
  },
  {
    id: 'data',
    title: 'Backup & sync',
    description:
      'Export or import your sanctuary JSON, optional Google Drive vault, and check extension version.',
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    description:
      'Activity and error log for troubleshooting (Settings → Diagnostics). Old “Logs” explore link opens here. Copy entries when reporting Drive, sync, or API issues.',
  },
];

export function getSettingsSection(id: SettingsSectionId): SettingsSectionMeta {
  return SETTINGS_SECTIONS.find((s) => s.id === id) ?? SETTINGS_SECTIONS[0];
}