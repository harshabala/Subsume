import { h } from 'preact';
import { Onboarding } from './pages/Onboarding';
import { AppLayout } from './components/AppLayout';
import { AppRouter } from './components/AppRouter';
import { useAppState } from './hooks/useAppState';
import { useRouting } from './hooks/useRouting';
import { usePrefetch } from './hooks/usePrefetch';
import './styles/sidebar.css';

export function App() {
  const { prefs, stats, peopleCount, completeOnboarding } = useAppState();
  const { currentPage, setCurrentPage, captureMediaId, setCaptureMediaId } = useRouting();
  const { prefetchPage } = usePrefetch(currentPage);

  if (!prefs) {
    return (
      <div className="app-layout">
        <nav className="fixed-top-nav">
          <div className="nav-logo">Subsume</div>
          <div className="nav-tabs-skeleton">
            <div className="skeleton skeleton-tab skeleton-tab-sized" />
            <div className="skeleton skeleton-tab skeleton-tab-sized" />
            <div className="skeleton skeleton-tab skeleton-tab-sized" />
          </div>
        </nav>
        <main className="main-content">
          <div className="page-container">
            <div className="skeleton app-skeleton-header" />
            <div className="app-skeleton-stats-grid">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton skeleton-stat" style={{ animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!prefs.onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <AppLayout
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      prefetchPage={prefetchPage}
      stats={stats}
      peopleCount={peopleCount}
      captureMediaId={captureMediaId}
      setCaptureMediaId={setCaptureMediaId}
    >
      <AppRouter
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setCaptureMediaId={setCaptureMediaId}
      />
    </AppLayout>
  );
}