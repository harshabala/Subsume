import { h } from 'preact';
import { MediaItem, WeeklyDigest } from '@/shared/types';
import { PlatformChips } from './PlatformChips';
import { pickRating, platformsToAvailability } from '../utils/mediaUtils';
import { DigestPick } from '../hooks/useHomeData';

interface WeeklyDigestSectionProps {
  weeklyDigest: WeeklyDigest | null;
  weeklyPicks: DigestPick[];
  refreshingDigest: boolean;
  platformNames: string;
  digestBadge: string;
  addedIds: Set<string>;
  onNavigate: (page: 'library' | 'recommendations' | 'new-releases') => void;
  onRefreshDigest: () => void;
  onSelectMedia: (media: MediaItem) => void;
  onAddMedia: (media: MediaItem) => void;
}

export function WeeklyDigestSection({
  weeklyDigest,
  weeklyPicks,
  refreshingDigest,
  platformNames,
  digestBadge,
  addedIds,
  onNavigate,
  onRefreshDigest,
  onSelectMedia,
  onAddMedia,
}: WeeklyDigestSectionProps) {
  return (
    <section>
      <div className="home-section-header wrap">
        <div>
          <div className="home-section-title-row">
            <h3 className="home-section-title">This Week</h3>
            {weeklyDigest && (
              <span className={`home-digest-badge ${weeklyDigest.llmGenerated ? 'ai' : 'algo'}`}>
                {digestBadge}
              </span>
            )}
          </div>
          <p className="home-section-desc">
            {platformNames ? `Programme arrivals on ${platformNames}` : 'Curated programme releases'}
          </p>
        </div>
        <div className="home-btn-group">
          <button
            className="optical-button sm"
            disabled={refreshingDigest}
            onClick={onRefreshDigest}
          >
            {refreshingDigest ? 'Refreshing…' : 'Refresh Programme'}
          </button>
          <button className="optical-button sm" onClick={() => onNavigate('new-releases')}>
            Full Programme
          </button>
        </div>
      </div>

      {weeklyPicks.length === 0 ? (
        <div className="sanctuary-empty-plaque home-empty-notice">
          <span className="sanctuary-plaque-index">Programme Notice</span>
          <p className="sanctuary-plaque-text">No weekly programme yet. Check your TMDb API key in Settings or refresh programme.</p>
        </div>
      ) : (
        <div className="home-weekly-grid">
          {weeklyPicks.map((pick) => {
            const media = pick.media;
            const rating = media ? pickRating(media) : null;
            const availability = platformsToAvailability(pick.platforms);

            return (
              <div
                key={pick.mediaId}
                className={`sanctuary-media-card ${media ? 'clickable' : 'default-cursor'}`}
                onClick={() => media && onSelectMedia(media)}
              >
                <div className="sanctuary-card-poster">
                  {media?.posterUrl ? (
                    <img src={media.posterUrl} alt={pick.title} className="sanctuary-poster-img" loading="lazy" />
                  ) : (
                    <div className="sanctuary-poster-placeholder">
                      <span className="sanctuary-placeholder-title">No Image</span>
                    </div>
                  )}
                </div>
                <div className="sanctuary-card-content">
                  <h4 className="sanctuary-card-title">{pick.title}</h4>
                  <p className="sanctuary-card-synopsis">
                    {pick.reason}
                  </p>
                  <div className="home-chips-wrap">
                    <PlatformChips availability={availability} max={3} compact />
                  </div>
                  <div className="sanctuary-card-meta">
                    <span>{pick.year}</span>
                    {rating && <span>{rating}</span>}
                  </div>
                  {media && (
                    <div className="sanctuary-card-actions">
                      <button
                        className="sanctuary-acquire-btn"
                        disabled={addedIds.has(media.id)}
                        onClick={(e) => { e.stopPropagation(); onAddMedia(media); }}
                      >
                        {addedIds.has(media.id) ? 'Acquired' : '+ Acquire'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
