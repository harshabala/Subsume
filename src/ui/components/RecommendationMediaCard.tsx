import { h } from 'preact';
import { MediaItem } from '@/shared/types';
import '../styles/recommendations.css';

interface RecommendationMediaCardProps {
  media: MediaItem;
  explanation: string;
  onClick: () => void;
}

export function RecommendationMediaCard({ media, explanation, onClick }: RecommendationMediaCardProps) {
  const tmdbRating = media.ratings?.find(r => r.provider === 'tmdb');

  return (
    <button
      type="button"
      className="media-card recommendation-media-card recommendation-media-card-btn"
      onClick={onClick}
      aria-label={`View details for ${media.canonicalTitle}`}
    >
       <div className="recommendation-media-card-content">
         <div className="media-card-poster recommendation-media-card-poster-wrapper">
           {media.posterUrl ? (
             <img src={media.posterUrl} alt={media.canonicalTitle} loading="lazy" decoding="async" />
           ) : (
             <div className="empty-poster recommendation-media-card-poster-empty">No Image</div>
           )}
         </div>
         <div>
           <h4 className="media-card-title">{media.canonicalTitle}</h4>
           <div className="media-card-meta">
             <span>{media.year}</span>
             {tmdbRating && (
                <span className="media-card-rating">
                  SCORE {tmdbRating.score.toFixed(1)}
                </span>
             )}
           </div>
           <div className="recommendation-media-card-genres">
              {media.genres.slice(0, 2).map((g) => (
                <span key={g} className="recommendation-media-card-genre">{g}</span>
              ))}
           </div>
         </div>
       </div>

       <div className="recommendation-media-card-explanation">
          <div className="recommendation-media-card-explanation-content">
            <span className="sanctuary-subtitle curator-note-title">Curator&apos;s note</span>
            <span className="recommendation-media-card-explanation-text">
              {explanation}
            </span>
          </div>
       </div>
    </button>
  );
}
