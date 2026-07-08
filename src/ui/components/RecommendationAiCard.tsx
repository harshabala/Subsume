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
  const tmdbRating = rec.ratings.find((r) => r.provider === 'tmdb');
  const openable = Boolean(rec.tmdbId);

  const openAsMedia = () => {
    if (!rec.tmdbId) return;
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
  };

  const posterBlock = (
    <div className="recommendation-ai-card-poster-wrapper">
      {rec.posterUrl ? (
        <img src={rec.posterUrl} alt="" className="recommendation-ai-card-poster-img" loading="lazy" decoding="async" aria-hidden="true" />
      ) : (
        <div className="recommendation-ai-card-poster-empty">{rec.title}</div>
      )}
      {tmdbRating && <div className="recommendation-ai-card-rating">SCORE {tmdbRating.score.toFixed(1)}</div>}
    </div>
  );

  const textBlock = (
    <>
      <div className="recommendation-ai-card-title">{rec.title}</div>
      <div className="recommendation-ai-card-meta">
        {rec.year} · {rec.type === 'movie' ? 'Movie' : 'TV'}
      </div>
      <div className="recommendation-ai-card-reason">{rec.reason}</div>
      {showSeedPill && rec.seedTitle && (
        <div className="recommendation-ai-card-seed-pill">REF. {rec.seedTitle}</div>
      )}
    </>
  );

  return (
    <article className={`recommendation-ai-card ${openable ? 'recommendation-ai-card--openable' : ''}`}>
      {openable ? (
        <button
          type="button"
          className="recommendation-ai-card-open"
          onClick={openAsMedia}
          aria-label={`View details for ${rec.title}`}
        >
          {posterBlock}
          <div className="recommendation-ai-card-body">{textBlock}</div>
        </button>
      ) : (
        <>
          {posterBlock}
          <div className="recommendation-ai-card-body">{textBlock}</div>
        </>
      )}
      {rec.tmdbId && (
        <div className="recommendation-ai-card-footer">
          <button
            type="button"
            disabled={isAdded}
            onClick={() => onAddClick(rec)}
            className={`sanctuary-acquire-btn recommendation-ai-card-acquire-btn ${isAdded ? 'recommendation-ai-card-add-button-added' : 'recommendation-ai-card-add-button-unadded'}`}
          >
            {isAdded ? 'In library' : 'Add to library'}
          </button>
        </div>
      )}
    </article>
  );
}