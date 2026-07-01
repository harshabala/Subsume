import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../shared/messages';
import { MessageType, UserPreferences, LibraryItem, MediaItem, PersonItem } from '../../shared/types';
import { LibraryStats } from '../types';

export function useAppState() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<LibraryStats>({ movieCount: 0, tvCount: 0 });
  const [peopleCount, setPeopleCount] = useState(0);

  useEffect(() => {
    sendMessage<Record<string, unknown>, UserPreferences>(MessageType.GET_PREFERENCES, {}).then((res) => {
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    }).catch((err) => console.error('[Subsume] Failed to fetch preferences:', err));

    sendMessage<Record<string, unknown>, { library: LibraryItem; media: MediaItem }[]>(MessageType.GET_LIBRARY, {}).then((res) => {
      if (res.success && res.data) {
        const movieCount = res.data.filter((item) => item.media?.type === 'movie').length;
        const tvCount = res.data.filter((item) => item.media?.type === 'tv').length;
        setStats({ movieCount, tvCount });
      }
    }).catch((err) => console.error('[Subsume] Failed to fetch library:', err));

    sendMessage<Record<string, unknown>, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {}).then((res) => {
      if (res.success && res.data?.people) {
        setPeopleCount(res.data.people.length);
      }
    }).catch((err) => console.error('[Subsume] Failed to fetch people:', err));
  }, []);

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (message && typeof message === 'object' && 'type' in message && (message as Record<string, unknown>).type === 'FILMMAKERS_UPDATED') {
        sendMessage<Record<string, unknown>, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {}).then((res) => {
          if (res.success && res.data?.people) {
            setPeopleCount(res.data.people.length);
          }
        }).catch((err) => console.error('[Subsume] Failed to fetch people on update:', err));
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const completeOnboarding = async () => {
    if (!prefs) return;
    const newPrefs = { ...prefs, onboardingComplete: true };
    try {
      await sendMessage(MessageType.SET_PREFERENCES, newPrefs);
      setPrefs(newPrefs);
    } catch (err) {
      console.error('[Subsume] Failed to save onboarding completion:', err);
    }
  };

  return { prefs, stats, peopleCount, completeOnboarding };
}
