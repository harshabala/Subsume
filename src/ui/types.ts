export type Page = 'home' | 'library' | 'search' | 'people' | 'stats' | 'recommendations' | 'new-releases' | 'alerts' | 'settings' | 'logs';

export interface LibraryStats {
  movieCount: number;
  tvCount: number;
}

export interface NavItem {
  key: Page;
  label: string;
  icon: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}
