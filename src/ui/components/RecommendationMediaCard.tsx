import { h } from 'preact';
import { MediaItem } from '@/shared/types';
import '../styles/recommendations.css';

interface RecommendationMediaCardProps {
  media: MediaItem;
  explanation: string;
  onClick: () => void;
}

export function RecommendationMediaCard({ media, explanation, onClick }: RecommendationMediaCardProps) {
  return (
    <div className="media-card recommendation-media-card" onClick={onClick}>
       <div className="recommendation-media-card-content">
         <div className="media-card-poster recommendation-media-card-poster-wrapper">
           {media.posterUrl ? (
             <img src={media.posterUrl} alt={media.canonicalTitle} loading="lazy" />
           ) : (
             <div className="empty-poster recommendation-media-card-poster-empty">No Image</div>
           )}
         </div>
         <div>
           <h4 className="media-card-title">{media.canonicalTitle}</h4>
           <div className="media-card-meta">
             <span>{media.year}</span>
             {media.ratings?.find(r => r.provider === 'tmdb') && (
                <span className="media-card-rating" style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-artwork)' }}>
                  SCORE {media.ratings.find(r => r.provider === 'tmdb')!.score.toFixed(1)}
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
          <div className="recommendation-media-card-explanation-content" style={{ flexDirection: 'column', gap: '4px' }}>
            <span className="sanctuary-subtitle" style={{ fontSize: '9px', letterSpacing: '0.2em' }}>CURATOR'S NOTE</span>
            <span className="recommendation-media-card-explanation-text" style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: '14px', color: 'var(--text-artwork)' }}>
              {explanation}
            </span>
          </div>
       </div>
    </div>
  );
}
