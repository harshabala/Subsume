import { h } from 'preact';
import '../styles/onboarding.css';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  return (
    <div className="onboarding-screen">
      <div className="onboarding-glow-cool" />
      <div className="onboarding-glow-warm" />
      <div className="onboarding-rule-top" />

      <div className="onboarding-content">
        <div className="onboarding-monogram">SUBSUME</div>

        <h1 className="onboarding-headline">
          Your private<br />picture palace.
        </h1>

        <div className="onboarding-divider" />

        <p className="onboarding-body">
          Not a tracker. Not a spreadsheet. A place to hold what you watch,
          where your afterglow and memory matter more than any algorithm's tally.
        </p>

        <div className="onboarding-pillars">
          {[
            { label: 'Discover', description: 'Marquee plaques on the pages you browse, with ratings woven in, without breaking your flow.' },
            { label: 'Capture', description: 'A quiet canvas asks what stayed with you. Resonance before metadata, always.' },
            { label: 'Archive', description: 'An editorial ledger of your taste, arranged by intent, not date filed.' },
          ].map((item, i) => (
            <div key={i} className="onboarding-pillar">
              <span className="onboarding-pillar-label">{item.label}</span>
              <span className="onboarding-pillar-desc">{item.description}</span>
            </div>
          ))}
        </div>

        <button className="onboarding-cta" onClick={onComplete}>
          Enter the house
        </button>
      </div>

      <div className="onboarding-rule-bottom" />
    </div>
  );
}