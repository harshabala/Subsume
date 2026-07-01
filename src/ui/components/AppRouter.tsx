import { h } from 'preact';
import { Page } from '../types';
import { Home } from '../pages/Home';
import { Library } from '../pages/Library';
import { Recommendations } from '../pages/Recommendations';
import { NewReleases } from '../pages/NewReleases';
import { Settings } from '../pages/Settings';
import { Search } from '../pages/Search';
import { Stats } from '../pages/Stats';
import { People } from '../pages/People';
import { Alerts } from '../pages/Alerts';
import { Logs } from '../pages/Logs';

interface AppRouterProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  setCaptureMediaId: (id: string | null) => void;
}

export function AppRouter({ currentPage, setCurrentPage, setCaptureMediaId }: AppRouterProps) {
  switch (currentPage) {
    case 'home':
      return <Home onNavigate={setCurrentPage} onOpenCapture={setCaptureMediaId} />;
    case 'library':
      return <Library />;
    case 'search':
      return <Search />;
    case 'people':
      return <People />;
    case 'stats':
      return <Stats />;
    case 'recommendations':
      return <Recommendations />;
    case 'new-releases':
      return <NewReleases />;
    case 'alerts':
      return <Alerts />;
    case 'logs':
      return <Logs />;
    case 'settings':
      return <Settings />;
    default:
      return null;
  }
}
