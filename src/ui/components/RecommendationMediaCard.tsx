import { h } from 'preact';
import { MediaItem } from '@/shared/types';
import '../styles/recommendations.css';

interface RecommendationMediaCardProps {
  media: MediaItem;
  explanation: string;
  onClick: () => void;
  onDismiss?: (workId: string) => void;
}

export function RecommendationMediaCard({
  media,
  explanation,
  onClick,
  onDismiss,
}: RecommendationMediaCardProps) {
  const tmdbRating = media.ratings?.find(r => r.provider === 'tmdb');
  const isBook = media.type === 'book';

  return (
    <div className="media-card recommendation-media-card">
      <button
        type="button"
        className="recommendation-media-card-btn"
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
             {isBook && (
               <span className="recommendation-type-badge" aria-label="Book">Book</span>
             )}
           </div>
           <div>
             <h4 className="media-card-title">{media.canonicalTitle}</h4>
             <div className="media-card-meta">
               <span>{media.year}</span>
               {isBook && <span className="recommendation-type-badge-inline">Book</span>}
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
      {onDismiss && (
        <button
          type="button"
          className="recommendation-dismiss-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(media.id);
          }}
          aria-label={`Dismiss ${media.canonicalTitle}`}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
