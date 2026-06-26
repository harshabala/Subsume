import { h } from 'preact';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'hsl(240, 18%, 4%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      {/* Ambient glow — upper left */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, hsla(240, 60%, 30%, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Ambient glow — lower right */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, hsla(45, 80%, 50%, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Horizontal rule top */}
      <div style={{
        position: 'absolute',
        top: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 1,
        height: 48,
        background: 'linear-gradient(to bottom, transparent, hsla(0,0%,100%,0.12))',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 520, padding: '0 40px' }}>

        {/* Monogram */}
        <div style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 13,
          fontWeight: 300,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'hsl(45, 70%, 58%)',
          marginBottom: 48,
          opacity: 0.9,
        }}>
          SUBSUME
        </div>

        {/* Hero headline */}
        <h1 style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 42,
          fontWeight: 300,
          fontStyle: 'italic',
          lineHeight: 1.2,
          color: 'hsl(0, 0%, 93%)',
          margin: '0 0 20px',
          letterSpacing: '-0.02em',
        }}>
          Your private<br />cinematic sanctuary.
        </h1>

        {/* Divider line */}
        <div style={{
          width: 40,
          height: 1,
          background: 'hsla(45, 70%, 58%, 0.5)',
          margin: '0 auto 28px',
        }} />

        {/* Body */}
        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          lineHeight: 1.75,
          color: 'hsl(240, 8%, 50%)',
          margin: '0 0 48px',
          fontWeight: 300,
          letterSpacing: '0.01em',
        }}>
          Not a tracker. Not a list. A place to reflect on what you watch —
          where your emotional recall matters more than any algorithm's opinion.
        </p>

        {/* Three pillars */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          marginBottom: 52,
          borderTop: '1px solid hsla(0,0%,100%,0.06)',
          borderBottom: '1px solid hsla(0,0%,100%,0.06)',
        }}>
          {[
            { label: 'Discover', description: 'Museum plaques appear on any page you browse — ratings, without breaking your flow.' },
            { label: 'Capture', description: 'A quiet canvas asks what stayed with you. Emotion before metadata, always.' },
            { label: 'Archive', description: 'An editorial library of your taste — organised by intent, not date added.' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 20,
              padding: '18px 0',
              borderBottom: i < 2 ? '1px solid hsla(0,0%,100%,0.04)' : 'none',
              textAlign: 'left',
            }}>
              <span style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontSize: 13,
                fontStyle: 'italic',
                color: 'hsl(45, 70%, 58%)',
                minWidth: 72,
                letterSpacing: '0.01em',
              }}>
                {item.label}
              </span>
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                color: 'hsl(240, 8%, 48%)',
                lineHeight: 1.5,
                fontWeight: 300,
              }}>
                {item.description}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onComplete}
          style={{
            background: 'transparent',
            border: '1px solid hsla(45, 70%, 58%, 0.45)',
            color: 'hsl(45, 75%, 65%)',
            padding: '12px 40px',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 220ms ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'hsla(45, 70%, 58%, 0.08)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsla(45, 70%, 58%, 0.7)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsla(45, 70%, 58%, 0.45)';
          }}
        >
          Enter
        </button>
      </div>

      {/* Bottom rule */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 1,
        height: 48,
        background: 'linear-gradient(to top, transparent, hsla(0,0%,100%,0.08))',
      }} />
    </div>
  );
}
