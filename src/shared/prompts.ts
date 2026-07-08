import type { UserPreferences } from './types';

export type LlmPromptKey = 'curatorSystem' | 'recommendation' | 'digest' | 'grouping';

export const DEFAULT_PROMPTS: Record<LlmPromptKey, string> = {
  curatorSystem:
    'You are a personal film curator with deep knowledge of world cinema. You respond only with valid JSON.',

  recommendation: `Recommend exactly 8 titles this person would rate 8 or higher based on the TASTE PROFILE (JSON) above.

Rules:
- Prioritize craft, cinematography, thematic depth, and writing quality over general audience popularity.
- Weight emotionalRecall and qualitative excerpts heavily — they reflect what actually resonated.
- A low IMDb or TMDb score does NOT disqualify a title if it matches their taste signals.
- Never recommend titles already listed in highlyRated, liked, dislikedOrAbandoned, or watchedButUnrated.
- For each pick, set seedTitle to the single highly-rated title it most connects to.
- Vary across decades and countries — do not cluster in one era or language.

Respond with ONLY a valid JSON array, no markdown, no preamble:
[
  {
    "title": "exact title",
    "year": 1999,
    "type": "movie or tv",
    "reason": "max 30 words explaining the specific connection to their taste",
    "seedTitle": "title from their highly-rated list",
    "confidenceSignal": "high, medium, or low"
  }
]`,

  digest: `Select the best 15–20 titles for this viewer from the NEW RELEASES list only.

Rules:
- Pick ONLY from the releases provided — do not invent titles.
- Tie each reason to their taste profile (genres, top-rated titles, followed filmmakers).
- One concise sentence per pick.

Respond with ONLY valid JSON, no markdown:
[
  {
    "title": "Movie or Show Title",
    "year": 2024,
    "type": "movie",
    "reason": "Personalized reason tied to their watch history."
  }
]`,

  grouping: `Group the recommendations under the top-rated film they most connect to. Use at most 3 seed groups.
Some recommendations may share a seed group.

Respond with ONLY valid JSON, no markdown:
[
  {
    "seedTitle": "title from top-rated list",
    "recommendationTitles": ["Title1", "Title2"]
  }
]`,
};

export const CURATOR_JOURNEY_COPY = {
  headline: 'How your private curator works',
  steps: [
    'Subsume builds a taste profile from your sanctuary — watched titles, ratings, emotional recall, notes, followed filmmakers, and genres. Nothing leaves your browser except the prompt you send to your chosen LLM provider.',
    'On Recommendations, the curator reads that profile and suggests titles you have not logged yet, with a short reason tied to your history.',
    'Weekly, a background check can run the same logic against new streaming releases and notify you when picks are ready (keep the LLM enabled in Settings and add your API key).',
    'You may edit the curator instructions below. The taste profile JSON is assembled automatically each time — you do not edit that by hand.',
  ],
};

export function getEffectivePrompt(
  key: LlmPromptKey,
  prefs: UserPreferences
): string {
  const overrides: Partial<Record<LlmPromptKey, string | undefined>> = {
    curatorSystem: prefs.llmCuratorSystemPrompt,
    recommendation: prefs.llmPromptRecommendation,
    digest: prefs.llmPromptDigest,
    grouping: prefs.llmPromptGrouping,
  };
  const custom = overrides[key]?.trim();
  return custom && custom.length > 0 ? custom : DEFAULT_PROMPTS[key];
}

export function buildTasteProfilePayload(profile: import('./types').WatchProfile) {
  return {
    highlyRated: profile.topRated.map((e) => ({
      title: e.title,
      year: e.year,
      genres: e.genres,
      userRating: e.userRating,
      emotionalRecall: e.emotionalRecall,
      noteExcerpt: e.noteExcerpt,
    })),
    liked: profile.liked.map((e) => ({
      title: e.title,
      year: e.year,
      genres: e.genres,
      userRating: e.userRating,
      noteExcerpt: e.noteExcerpt,
    })),
    dislikedOrAbandoned: profile.disliked.map((e) => ({
      title: e.title,
      year: e.year,
      genres: e.genres,
      userRating: e.userRating,
    })),
    watchedButUnrated: profile.unrated.map((e) => ({
      title: e.title,
      year: e.year,
      genres: e.genres,
    })),
    followedFilmmakers: profile.followedCreators.map((c) => ({
      name: c.name,
      role: c.role,
    })),
    preferredGenres: profile.favoriteGenres,
    totalFilmsWatched: profile.totalWatched,
    wishlist: (profile.wishlist ?? []).map((e) => ({
      title: e.title,
      year: e.year,
      genres: e.genres,
    })),
  };
}