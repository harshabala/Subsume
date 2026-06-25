import { LibraryStatus } from '@/shared/types';

export const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'to-watch', label: 'Want to Watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'watched', label: 'Watched' },
  { value: 'abandoned', label: 'Abandoned' },
];
