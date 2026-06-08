import { UserPreferences, LibraryItem, MediaItem, Recommendation, GroupedRecommendation, WatchProfile, PersonalizedRecommendation, RecommendationGroup } from '@/shared/types';
import { getAllLibraryItems, getAllMediaMap, getPreferences, putMediaItem, findMediaByTitle } from './storage';
import { searchTitle } from './tmdb';
import { buildWatchProfile } from './context';

export interface LLMRawRecommendation {
  title: string;
  year?: number;
  type: 'movie' | 'tv';
  explanation: string;
}

export interface LLMRawGrouped {
  seedTitle: string;
  recommendations: LLMRawRecommendation[];
}

/**
 * Constructs a prompt for the LLM based on the user's local library.
 */
function buildPrompt(watched: any[], toWatch: any[], seedTitles?: string[]): string {
  let prompt = "You are an expert movie and TV show recommender.\n\n";

  if (watched.length > 0) {
    prompt += "Here are the titles the user has already watched (with their ratings if available):\n";
    watched.forEach(w => {
      const ratingStr = w.library.userRating ? ` - Rated: ${w.library.userRating}/10` : '';
      prompt += `- ${w.media.canonicalTitle} (${w.media.year}) [${w.media.genres.join(', ')}]${ratingStr}\n`;
    });
    prompt += "\n";
  }

  if (toWatch.length > 0) {
    prompt += "Here are titles in the user's watchlist that they want to watch:\n";
    toWatch.forEach(w => {
      prompt += `- ${w.media.canonicalTitle} (${w.media.year}) [${w.media.genres.join(', ')}]\n`;
    });
    prompt += "\n";
  }

  if (seedTitles && seedTitles.length > 0) {
    prompt += `Given that they loved ${seedTitles.join(', ')}, recommend 8 NEW titles (movies or TV shows) that they haven't seen yet but would probably love, and group your recommendations under the seed title they most connect to.\n`;
    prompt += "Ensure you do NOT recommend titles already in the list.\n\n";
    prompt += "Respond strictly in the following JSON format without markdown code blocks:\n";
    prompt += `[
  {
    "seedTitle": "One of the seed titles",
    "recommendations": [
      {
        "title": "Movie or Show Title",
        "year": 2024,
        "type": "movie",
        "explanation": "A one-sentence engaging explanation of why they would like this based on their exact watched history."
      }
    ]
  }
]`;
  } else {
    prompt += "Based on this library, please recommend 5 NEW titles (movies or TV shows) that they haven't seen yet but would probably love. Ensure you do NOT recommend titles already in the list.\n\n";
    prompt += "Respond strictly in the following JSON format without markdown code blocks:\n";
    prompt += `[
  {
    "title": "Movie or Show Title",
    "year": 2024,
    "type": "movie",
    "explanation": "A one-sentence engaging explanation of why they would like this based on their exact watched history."
  }
]`;
  }

  return prompt;
}

/**
 * Calls the specified LLM provider with the prompt.
 */
export async function callLLMProvider(prompt: string, prefs: UserPreferences): Promise<string> {
  const provider = prefs.llmProvider || 'openai';
  const apiKey = prefs.llmApiKey;

  if (!apiKey) {
    throw new Error('LLM API key is missing. Please set it in Settings.');
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error('OpenAI API error: ' + await res.text());
    const data = await res.json();
    return data.choices[0].message.content;
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error('Anthropic API error: ' + await res.text());
    const data = await res.json();
    return data.content[0].text;
  }

  if (provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (!res.ok) throw new Error('Gemini API error: ' + await res.text());
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

/**
 * Main entry point to get LLM recommendations and resolve them to MediaItems.
 */
export async function generateLLMRecommendations(): Promise<Recommendation[] | GroupedRecommendation[]> {
  const prefs = await getPreferences();
  
  if (!prefs.llmEnabled || !prefs.llmApiKey) {
    throw new Error('LLM features are disabled or API key is missing.');
  }

  const library = await getAllLibraryItems();
  const mediaIds = library.map((l) => l.mediaId);
  const mediaMap = await getAllMediaMap(mediaIds);

  const joined = library.map(l => ({ library: l, media: mediaMap[l.mediaId] })).filter(j => !!j.media);
  const watched = joined.filter(j => j.library.status === 'watched');
  const toWatch = joined.filter(j => j.library.status === 'to-watch');

  if (watched.length === 0 && toWatch.length === 0) {
    return [];
  }

  // Determine if we should group recommendations ("Because You Watched X")
  const highlyRatedWatched = watched.filter(w => w.library.userRating && w.library.userRating >= 8);
  const isGroupedMode = highlyRatedWatched.length >= 3;
  let seedTitles: string[] = [];

  if (isGroupedMode) {
    const sortedHighlyRated = [...highlyRatedWatched].sort((a, b) => (b.library.userRating || 0) - (a.library.userRating || 0));
    seedTitles = sortedHighlyRated.slice(0, 3).map(w => w.media.canonicalTitle);
  }

  const prompt = buildPrompt(watched, toWatch, seedTitles);
  
  try {
    const responseText = await callLLMProvider(prompt, prefs);
    const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    if (isGroupedMode) {
      let rawGroups: LLMRawGrouped[];
      try {
        rawGroups = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('[Subsume] Failed to parse LLM response as JSON:', parseErr);
        throw new Error('LLM returned invalid JSON format');
      }

      // Flatten recommendations to resolve them concurrently
      const flatRecommendationsToResolve: { seedTitle: string; raw: LLMRawRecommendation }[] = [];
      for (const group of rawGroups) {
        if (!group.recommendations || !Array.isArray(group.recommendations)) continue;
        for (const rec of group.recommendations) {
          flatRecommendationsToResolve.push({ seedTitle: group.seedTitle, raw: rec });
        }
      }

      // Resolve each title in parallel, using the local DB cache when available
      const recommendationPromises = flatRecommendationsToResolve.map(async (item) => {
        try {
          const raw = item.raw;
          if (!raw.title) return null;

          // Check if movie details are cached in local database first
          const cachedItem = await findMediaByTitle(raw.title, raw.year);
          if (cachedItem) {
            return {
              seedTitle: item.seedTitle,
              recommendation: {
                mediaId: cachedItem.id,
                explanation: raw.explanation || 'Recommended by AI',
              }
            };
          }

          // If not in database, fall back to TMDb search
          const mediaItem = await searchTitle(raw.title, raw.year, raw.type);
          if (mediaItem) {
            // Save to DB so we cache it for future recommendations
            await putMediaItem(mediaItem);
            return {
              seedTitle: item.seedTitle,
              recommendation: {
                mediaId: mediaItem.id,
                explanation: raw.explanation || 'Recommended by AI',
              }
            };
          }

          return null;
        } catch (innerErr) {
          console.warn(`[Subsume] Failed to resolve recommendation for "${item.raw.title}":`, innerErr);
          return null;
        }
      });

      const resolvedFlat = await Promise.all(recommendationPromises);

      // Re-group them
      const groupsMap: Record<string, Recommendation[]> = {};
      for (const item of resolvedFlat) {
        if (!item) continue;
        if (!groupsMap[item.seedTitle]) {
          groupsMap[item.seedTitle] = [];
        }
        groupsMap[item.seedTitle].push(item.recommendation);
      }

      const finalGrouped: GroupedRecommendation[] = Object.entries(groupsMap)
        .map(([seedTitle, recommendations]) => ({
          seedTitle,
          recommendations,
        }))
        .filter(g => g.recommendations.length > 0);

      return finalGrouped;
    } else {
      let rawRecs: LLMRawRecommendation[];
      try {
        rawRecs = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('[Subsume] Failed to parse LLM response as JSON:', parseErr);
        throw new Error('LLM returned invalid JSON format');
      }

      // Resolve each title in parallel, using the local DB cache when available
      const recommendationPromises = rawRecs.map(async (raw): Promise<Recommendation | null> => {
        try {
          if (!raw.title) return null;

          // Check if movie details are cached in local database first
          const cachedItem = await findMediaByTitle(raw.title, raw.year);
          if (cachedItem) {
            return {
              mediaId: cachedItem.id,
              explanation: raw.explanation || 'Recommended by AI',
            };
          }

          // If not in database, fall back to TMDb search
          const mediaItem = await searchTitle(raw.title, raw.year, raw.type);
          if (mediaItem) {
            // Save to DB so we cache it for future recommendations
            await putMediaItem(mediaItem);
            return {
              mediaId: mediaItem.id,
              explanation: raw.explanation || 'Recommended by AI',
            };
          }

          return null;
        } catch (innerErr) {
          console.warn(`[Subsume] Failed to resolve recommendation for "${raw.title}":`, innerErr);
          return null;
        }
      });

      const resolvedRecs = await Promise.all(recommendationPromises);
      const finalRecommendations = resolvedRecs.filter((rec): rec is Recommendation => rec !== null);

      return finalRecommendations;
    }
  } catch (err) {
    console.error('LLM recommendation error:', err);
    throw err;
  }
}
// ─── Phase 4: Personalized Prompt Engine ─────────────────────────────

/**
 * Builds a structured prompt string from the user's WatchProfile.
 * Pure function — no side effects, no network calls.
 */
function buildPersonalizedPrompt(profile: WatchProfile): string {
  const lines: string[] = [];

  // Section 1 — Taste profile
  lines.push('TASTE PROFILE:');

  if (profile.topRated.length > 0) {
    const topRatedStr = profile.topRated
      .map(e => `${e.title} (${e.year}) [${e.genres.join(', ')}]`)
      .join(', ');
    lines.push(`Highly rated (8–10/10): ${topRatedStr}`);
  } else {
    lines.push('Highly rated (8–10/10): none yet');
  }

  if (profile.liked.length > 0) {
    const likedStr = profile.liked
      .map(e => `${e.title} (${e.year})`)
      .join(', ');
    lines.push(`Liked (6–7/10): ${likedStr}`);
  }

  if (profile.disliked.length > 0) {
    const dislikedStr = profile.disliked
      .map(e => e.title)
      .join(', ');
    lines.push(`Disliked or abandoned (≤4/10): ${dislikedStr}`);
  }

  if (profile.unrated.length > 0) {
    const unratedStr = profile.unrated
      .map(e => `${e.title} (${e.year})`)
      .join(', ');
    lines.push(`Watched but unrated: ${unratedStr}`);
  }

  lines.push(`Total films watched: ${profile.totalWatched}`);
  lines.push('');

  // Section 2 — Creator affinities (only if followers exist)
  if (profile.followedCreators.length > 0) {
    lines.push('FOLLOWED FILMMAKERS:');
    const creatorsStr = profile.followedCreators
      .map(c => `${c.name} (${c.role})`)
      .join(', ');
    lines.push(creatorsStr);
    lines.push('');
  }

  // Section 3 — Genre preferences
  if (profile.favoriteGenres.length > 0) {
    lines.push(`PREFERRED GENRES: ${profile.favoriteGenres.join(', ')}`);
    lines.push('');
  }

  // Section 4 — Task instruction
  const alreadySeen = [
    ...profile.topRated.map(e => e.title),
    ...profile.liked.map(e => e.title),
    ...profile.disliked.map(e => e.title),
  ].join(', ');

  lines.push('TASK:');
  lines.push('Recommend exactly 8 titles this person would rate 8 or higher based on their taste profile above.');
  lines.push('');
  lines.push('Rules:');
  lines.push('- Prioritize craft, cinematography, thematic depth, and writing quality over general audience popularity');
  lines.push('- A low IMDb or TMDb score does NOT disqualify a title if it matches their taste signals');
  if (alreadySeen) {
    lines.push(`- Never recommend titles already in their lists above (${alreadySeen})`);
  } else {
    lines.push('- Never recommend titles already in their lists above');
  }
  lines.push('- For each recommendation identify the single title from their highly-rated list it most connects to (seedTitle)');
  lines.push('- Vary across decades and countries — do not cluster recommendations in one era or language');
  lines.push('');
  lines.push('Respond with ONLY a valid JSON array, no markdown, no preamble, no trailing text:');
  lines.push(`[
  {
    "title": "exact title",
    "year": 1999,
    "type": "movie or tv",
    "reason": "max 30 words explaining the specific connection to their taste",
    "seedTitle": "title from their highly-rated list",
    "confidenceSignal": "high, medium, or low"
  }
]`);

  return lines.join('\n');
}

/**
 * Builds a secondary grouping prompt to cluster flat recommendations under
 * seed titles from the user's top-rated list.
 * Only called when profile.topRated.length >= 3.
 */
function buildGroupingPrompt(
  profile: WatchProfile,
  recs: PersonalizedRecommendation[]
): string {
  const recSummary = recs
    .map(r => `${r.title} (${r.year}): ${r.reason}`)
    .join('\n');

  const topRatedSummary = profile.topRated
    .slice(0, 5)
    .map(e => `${e.title} (${e.year})`)
    .join(', ');

  return [
    'Given these 8 film recommendations:',
    recSummary,
    '',
    "And this viewer's top-rated films:",
    topRatedSummary,
    '',
    'Group the 8 recommendations under the top-rated film they most connect to. Use at most 3 seed groups.',
    'Some recommendations may share a seed group.',
    '',
    'Respond with ONLY valid JSON, no markdown:',
    `[
  {
    "seedTitle": "title from top-rated list",
    "recommendationTitles": ["Title1", "Title2"]
  }
]`,
  ].join('\n');
}

/**
 * Calls the configured LLM provider with a personalized prompt built from
 * the user's actual watch history, ratings, notes, and followed filmmakers.
 *
 * Reuses callLLMProvider() — no HTTP logic duplicated.
 */
export async function getPersonalizedRecommendations(
  prefs: UserPreferences
): Promise<{
  flat: PersonalizedRecommendation[];
  grouped: RecommendationGroup[] | null;
}> {
  // Step 1 — Build profile
  const profile = await buildWatchProfile();

  if (profile.totalWatched < 3) {
    // Not enough watch history to personalize
    return { flat: [], grouped: null };
  }

  // Step 2 — Build prompt
  const prompt = buildPersonalizedPrompt(profile);

  // Step 3 — Call LLM provider (reuses existing callLLMProvider)
  const systemMessage = 'You are a personal film curator with deep knowledge of world cinema. You respond only with valid JSON.';
  const fullPrompt = `${systemMessage}\n\n${prompt}`;

  let rawText: string;
  try {
    rawText = await callLLMProvider(fullPrompt, prefs);
  } catch (err) {
    console.error('[Subsume] Primary LLM call failed:', err);
    return { flat: [], grouped: null };
  }

  // Step 4 — Parse response (strip markdown fences before parsing)
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  let parsedItems: Array<{
    title: string;
    year: number;
    type?: 'movie' | 'tv';
    reason?: string;
    seedTitle?: string;
    confidenceSignal?: 'high' | 'medium' | 'low';
  }>;

  try {
    parsedItems = JSON.parse(cleaned);
    if (!Array.isArray(parsedItems)) throw new Error('Expected JSON array');
  } catch (parseErr) {
    console.error('[Subsume] Failed to parse personalized recs JSON:', parseErr, 'Raw:', rawText);
    return { flat: [], grouped: null };
  }

  // Map parsed items to PersonalizedRecommendation with empty tmdbId to be filled in Step 5
  const prelimRecs: PersonalizedRecommendation[] = parsedItems.map(item => ({
    tmdbId: '',
    title: item.title || '',
    year: item.year || 0,
    type: item.type ?? 'movie',
    reason: item.reason ?? 'Recommended based on your taste',
    seedTitle: item.seedTitle,
    confidenceSignal: item.confidenceSignal ?? 'medium',
    ratings: [],
    posterUrl: undefined,
  })).filter(r => r.title.length > 0);

  // Step 5 — Resolve TMDb IDs concurrently
  const resolvedResults = await Promise.all(
    prelimRecs.map(async (rec): Promise<PersonalizedRecommendation | null> => {
      try {
        // Check local DB cache first
        const cached = await findMediaByTitle(rec.title, rec.year);
        if (cached) {
          return {
            ...rec,
            tmdbId: cached.id,
            posterUrl: cached.posterUrl || undefined,
            ratings: cached.ratings,
          };
        }

        // Fall back to TMDb search
        const mediaItem = await searchTitle(rec.title, rec.year, rec.type);
        if (mediaItem) {
          await putMediaItem(mediaItem);
          return {
            ...rec,
            tmdbId: mediaItem.id,
            posterUrl: mediaItem.posterUrl || undefined,
            ratings: mediaItem.ratings,
          };
        }

        return null;
      } catch (innerErr) {
        console.warn(`[Subsume] Failed to resolve personalized rec "${rec.title}":`, innerErr);
        return null;
      }
    })
  );

  const resolvedRecs = resolvedResults.filter(
    (r): r is PersonalizedRecommendation => r !== null && r.tmdbId.length > 0
  );

  // Step 6 — Seed grouping (conditional — only when enough data exists)
  let grouped: RecommendationGroup[] | null = null;

  if (profile.topRated.length >= 3 && resolvedRecs.length >= 4) {
    try {
      const groupingPrompt = buildGroupingPrompt(profile, resolvedRecs);
      const groupingText = await callLLMProvider(groupingPrompt, prefs);
      const groupingCleaned = groupingText.replace(/```json|```/g, '').trim();

      const rawGroups: Array<{ seedTitle: string; recommendationTitles: string[] }> =
        JSON.parse(groupingCleaned);

      if (Array.isArray(rawGroups)) {
        const groups: RecommendationGroup[] = rawGroups
          .map(g => {
            const matchedRecs = resolvedRecs.filter(r =>
              g.recommendationTitles.some(
                t => t.toLowerCase() === r.title.toLowerCase()
              )
            );
            return {
              seedTitle: g.seedTitle,
              recommendations: matchedRecs,
            };
          })
          .filter(g => g.recommendations.length > 0);

        if (groups.length > 0) {
          grouped = groups;
        }
      }
    } catch (groupErr) {
      // Grouping call failure is non-fatal — flat recs are already resolved
      console.warn('[Subsume] Grouping LLM call failed (non-fatal):', groupErr);
      grouped = null;
    }
  }

  return { flat: resolvedRecs, grouped };
}
