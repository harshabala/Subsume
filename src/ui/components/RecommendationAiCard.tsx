import { h } from 'preact';
import { PersonalizedRecommendation, MediaItem } from '@/shared/types';
import '../styles/recommendations.css';

interface RecommendationAiCardProps {
  rec: PersonalizedRecommendation;
  showSeedPill: boolean;
  isAdded: boolean;
  onCardClick: (media: MediaItem) => void;
  onAddClick: (rec: PersonalizedRecommendation) => void;
}

export function RecommendationAiCard({ rec, showSeedPill, isAdded, onCardClick, onAddClick }: RecommendationAiCardProps) {
  const tmdbRating = rec.ratings.find(r => r.provider === 'tmdb');

  return (
    <div
      className={`recommendation-ai-card ${rec.tmdbId ? 'recommendation-ai-card-clickable' : 'recommendation-ai-card-default'}`}
      onClick={() => {
        if (rec.tmdbId) {
          const media: MediaItem = {
            id: rec.tmdbId,
            canonicalTitle: rec.title,
            type: rec.type,
            year: rec.year,
            genres: [],
            ratings: rec.ratings,
            providers: [],
            posterUrl: rec.posterUrl || '',
          };
          onCardClick(media);
        }
      }}
    >
      <div className="recommendation-ai-card-poster-wrapper">
        {rec.posterUrl ? (
          <img
            src={rec.posterUrl}
            alt={rec.title}
            loading="lazy"
            className="recommendation-ai-card-poster-img"
          />
        ) : (
          <div className="recommendation-ai-card-poster-empty">
            {rec.title}
          </div>
        )}
        {tmdbRating && (
          <div className="recommendation-ai-card-rating">
            ★ {tmdbRating.score.toFixed(1)}
          </div>
        )}
      </div>

      <div className="recommendation-ai-card-body">
        <div className="recommendation-ai-card-title">
          {rec.title}
        </div>
        <div className="recommendation-ai-card-meta">
          {rec.year} · {rec.type === 'movie' ? 'Movie' : 'TV'}
        </div>
        <div className="recommendation-ai-card-reason">
          {rec.reason}
        </div>
        {showSeedPill && rec.seedTitle && (
          <div className="recommendation-ai-card-seed-pill">
            Because you liked {rec.seedTitle}
          </div>
        )}
        {rec.tmdbId && (
          <button
            disabled={isAdded}
            onClick={e => { e.stopPropagation(); onAddClick(rec); }}
            className={`recommendation-ai-card-add-button ${isAdded ? 'recommendation-ai-card-add-button-added' : 'recommendation-ai-card-add-button-unadded'}`}
          >
            {isAdded ? '✓ Added' : '+ Add'}
          </button>
        )}
      </div>
    </div>
  );
}
