import { h } from 'preact';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: 40 }}>
      {/* Hero Icon */}
      <div style={{ fontSize: 64, marginBottom: 24 }}>✨</div>

      {/* Welcome Title */}
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, background: 'linear-gradient(135deg, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Welcome to Subsume
      </h1>

      {/* Description */}
      <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', maxWidth: 500, lineHeight: 1.6, marginBottom: 40 }}>
        Stop context-switching. Subsume automatically detects movies and TV shows on whatever page you're currently scrolling, bringing ratings and quick-saves straight to your cursor. Because breaking your flow to search a title is a minor tragedy.
      </p>

      {/* Features Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40, textAlign: 'left', maxWidth: 640 }}>
        <div style={{ background: 'var(--color-surface-hover)', padding: 24, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e4e4ec' }}>🔎 Discover on Hover</h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Hover over any title on any site. Poster, ratings, and quick-add actions materialize instantly. Zero tab-switching required.
          </p>
        </div>
        <div style={{ background: 'var(--color-surface-hover)', padding: 24, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e4e4ec' }}>📚 Watchlist Central</h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Keep track of what you actually want to watch. Build your library directly from the web, and manage it in one quiet, elegant dashboard.
          </p>
        </div>
        <div style={{ background: 'var(--color-surface-hover)', padding: 24, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e4e4ec' }}>🍿 Honest Recommendations</h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Unlock AI suggestions that analyze your watch history and explain exactly why a title fits your taste. No black-box algorithmic nonsense here.
          </p>
        </div>
        <div style={{ background: 'var(--color-surface-hover)', padding: 24, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8, color: '#e4e4ec' }}>⚡ Fresh Off the Press</h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Stay on top of new releases and trending titles, fetched daily. Skip the endless scrolling on Netflix.
          </p>
        </div>
      </div>

      {/* Get Started Button */}
      <button 
        className="btn btn-primary" 
        onClick={onComplete}
        style={{ padding: '12px 32px', fontSize: 16, fontWeight: 600 }}
      >
        Start discovering
      </button>
    </div>
  );
}
