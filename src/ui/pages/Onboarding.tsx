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
          Your private<br />cinematic sanctuary.
        </h1>

        <div className="onboarding-divider" />

        <p className="onboarding-body">
          Not a tracker. Not a list. A place to reflect on what you watch,
          where your emotional recall matters more than any algorithm's opinion.
        </p>

        <div className="onboarding-pillars">
          {[
            { label: 'Discover', description: 'Museum plaques appear on any page you browse, with ratings, without breaking your flow.' },
            { label: 'Capture', description: 'A quiet canvas asks what stayed with you. Emotion before metadata, always.' },
            { label: 'Archive', description: 'An editorial library of your taste, organised by intent, not date added.' },
          ].map((item, i) => (
            <div key={i} className="onboarding-pillar">
              <span className="onboarding-pillar-label">{item.label}</span>
              <span className="onboarding-pillar-desc">{item.description}</span>
            </div>
          ))}
        </div>

        <button className="onboarding-cta" onClick={onComplete}>
          Enter
        </button>
      </div>

      <div className="onboarding-rule-bottom" />
    </div>
  );
}