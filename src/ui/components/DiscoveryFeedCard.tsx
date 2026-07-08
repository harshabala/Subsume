import { h } from 'preact';
import { DiscoveryFeedItem } from '@/shared/types';

function sourceLabel(source: DiscoveryFeedItem['source']): string {
  switch (source) {
    case 'trakt':
      return 'Now showing';
    case 'tvmaze':
      return 'Premiere';
    case 'wikidata':
      return 'Spotlight';
    default:
      return 'Discovery';
  }
}

export interface DiscoveryFeedCardProps {
  item: DiscoveryFeedItem;
  index?: number;
  onSelect: (item: DiscoveryFeedItem) => void;
}

export function DiscoveryFeedCard({ item, index = 0, onSelect }: DiscoveryFeedCardProps) {
  const ratingSuffix = item.rating != null ? `, rated ${item.rating.toFixed(1)}` : '';
  const staggerIndex = Math.min(index, 5);

  return (
    <button
      type="button"
      className="discovery-feed-card"
      style={{ '--feed-index': staggerIndex } as Record<string, number>}
      onClick={() => onSelect(item)}
      aria-label={`${item.title} (${item.year || 'year unknown'}). ${item.reason}${ratingSuffix}`}
    >
      <div className="discovery-feed-card-poster" aria-hidden="true">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="discovery-feed-card-placeholder">{item.type === 'tv' ? 'TV' : 'Film'}</div>
        )}
      </div>
      <div className="discovery-feed-card-body">
        <div className="discovery-feed-card-top">
          <span className={`discovery-feed-source ${item.source}`}>{sourceLabel(item.source)}</span>
          <span className="discovery-feed-year">{item.year || 'TBC'}</span>
        </div>
        <span className="discovery-feed-card-title">{item.title}</span>
        <p className="discovery-feed-card-reason">{item.reason}</p>
        {item.rating != null && (
          <span className="discovery-feed-rating">★ {item.rating.toFixed(1)}</span>
        )}
      </div>
    </button>
  );
}