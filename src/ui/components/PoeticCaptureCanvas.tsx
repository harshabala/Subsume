import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  MediaItem,
  MessageType,
  SanctuaryIntent,
  LibraryStatus,
  AddToListRequest,
  UpdateStatusRequest,
  SetUserNotesRequest,
  SetUserRatingRequest,
  GetMediaItemsRequest,
  LibraryItem,
} from '@/shared/types';
import { sendMessage } from '@/shared/messages';
import '../styles/poetic-sanctuary.css';

export interface PoeticCaptureCanvasProps {
  mediaId: string;
  onClose: () => void;
  onSave?: () => void;
}

export function PoeticCaptureCanvas({ mediaId, onClose, onSave }: PoeticCaptureCanvasProps) {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [emotionalRecall, setEmotionalRecall] = useState<string>('');
  const [intent, setIntent] = useState<SanctuaryIntent>('keep_memory');
  const [rating, setRating] = useState<number>(0);
  const [isWriting, setIsWriting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMedia = async () => {
      try {
        const res = await sendMessage<GetMediaItemsRequest, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, {
          mediaIds: [mediaId],
        });
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setMedia(res.data[0]);
        }
      } catch (err) {
        console.error('[PoeticCaptureCanvas] Failed to load media:', err);
      }
    };
    fetchMedia();
    return () => {
      isMounted = false;
    };
  }, [mediaId]);

  const handleSave = async () => {
    if (!media) return;
    try {
      await sendMessage<AddToListRequest, LibraryItem>(MessageType.ADD_TO_LIST, {
        mediaItem: media,
        type: media.type,
      });
      const statusMap: Record<SanctuaryIntent, LibraryStatus> = {
        keep_memory: 'watched',
        revisit_this_month: 'watching',
        wishlist: 'to-watch',
      };
      await sendMessage<UpdateStatusRequest, Record<string, unknown>>(MessageType.UPDATE_STATUS, {
        mediaId,
        status: statusMap[intent],
      });
      if (emotionalRecall.trim()) {
        await sendMessage<SetUserNotesRequest, Record<string, unknown>>(MessageType.SET_USER_NOTES, {
          mediaId,
          notes: emotionalRecall.trim(),
        });
      }
      if (rating > 0) {
        await sendMessage<SetUserRatingRequest, Record<string, unknown>>(MessageType.SET_USER_RATING, {
          mediaId,
          rating,
        });
      }
      onSave?.();
      onClose();
    } catch (err) {
      console.error('[PoeticCaptureCanvas] Save failed:', err);
    }
  };

  const posterStyle = {
    filter: isWriting ? 'blur(10px) brightness(0.5)' : 'none',
    transform: isWriting ? 'scale(1.03)' : 'none',
    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <div class="poetic-sanctuary-modal">
      <div class="poetic-backdrop">
        {media?.posterUrl && (
          <img
            src={media.posterUrl}
            alt={media.canonicalTitle}
            class="poetic-poster"
            style={posterStyle}
          />
        )}
      </div>

      <div class="poetic-content">
        <h1 class="poetic-heading">What stayed with you?</h1>

        <textarea
          class="poetic-textarea"
          placeholder="Reflect on the silence after..."
          value={emotionalRecall}
          onInput={(e) => setEmotionalRecall((e.currentTarget as HTMLTextAreaElement).value)}
          onFocus={() => setIsWriting(true)}
          onBlur={() => setIsWriting(false)}
        />

        {emotionalRecall.length > 0 && (
          <div class="progressive-controls">
            <div class="intent-selectors" data-testid="intent-selectors">
              <button
                type="button"
                data-intent="keep_memory"
                class={intent === 'keep_memory' ? 'active' : ''}
                onClick={() => setIntent('keep_memory')}
              >
                Keep This Memory
              </button>
              <button
                type="button"
                data-intent="revisit_this_month"
                class={intent === 'revisit_this_month' ? 'active' : ''}
                onClick={() => setIntent('revisit_this_month')}
              >
                Revisit This Month
              </button>
              <button
                type="button"
                data-intent="wishlist"
                class={intent === 'wishlist' ? 'active' : ''}
                onClick={() => setIntent('wishlist')}
              >
                Wishlist
              </button>
            </div>

            <div class="rating-control" data-testid="rating-control">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  data-rating={`${num}`}
                  class={rating === num ? 'active' : ''}
                  onClick={() => setRating(num)}
                >
                  {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][num - 1]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div class="poetic-actions">
          <button type="button" class="close-btn" onClick={onClose}>
            Close
          </button>
          <button type="button" class="save-btn" data-testid="save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
