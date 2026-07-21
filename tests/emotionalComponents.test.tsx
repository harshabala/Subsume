import { h } from 'preact';
import { render } from 'preact';
import { describe, it, expect, vi } from 'vitest';
import { EmotionalSliders } from '@/ui/components/EmotionalSliders';
import { EmotionalWeatherChart } from '@/ui/components/EmotionalWeatherChart';
import { EmptyStateProjection } from '@/ui/components/EmptyStateProjection';
import { DEFAULT_EMOTIONS } from '@/shared/emotions';
import type { LibraryItem } from '@/shared/types';

describe('EmotionalSliders', () => {
  it('renders four accessible sliders', () => {
    const container = document.createElement('div');
    render(
      <EmotionalSliders
        values={DEFAULT_EMOTIONS}
        onChange={vi.fn()}
        idPrefix="test"
      />,
      container,
    );

    const sliders = container.querySelectorAll('[role="slider"]');
    expect(sliders.length).toBe(4);
    expect(sliders[0].getAttribute('aria-valuenow')).toBe('50');
  });
});

describe('EmotionalWeatherChart', () => {
  it('renders empty state without emotional logs', () => {
    const container = document.createElement('div');
    const item: LibraryItem = {
      mediaId: 'media_1',
      status: 'watched',
      addedAt: 1,
      updatedAt: 1,
    };

    render(<EmotionalWeatherChart items={[item]} />, container);
    expect(container.textContent).toContain('afterglow across your archive');
  });

  it('renders chart legend when emotional data exists', () => {
    const container = document.createElement('div');
    const item: LibraryItem = {
      mediaId: 'media_1',
      status: 'watched',
      addedAt: 1,
      updatedAt: 1,
      awe: 70,
      melancholy: 40,
      tension: 55,
      warmth: 80,
    };

    render(<EmotionalWeatherChart items={[item]} />, container);
    expect(container.querySelector('.emotional-weather-svg')).toBeTruthy();
    expect(container.textContent).toContain('Afterglow over time');
  });
});

describe('EmptyStateProjection', () => {
  it('renders the archive inscription empty-state copy', () => {
    const container = document.createElement('div');
    render(<EmptyStateProjection />, container);
    expect(container.textContent).toContain('Nothing inscribed yet');
    expect(container.textContent).toContain('first inscription');
  });

  it('renders a clear-filters action when provided', () => {
    const container = document.createElement('div');
    let clicked = false;
    render(
      <EmptyStateProjection
        title="No inscriptions match"
        actionLabel="Clear filters"
        onAction={() => {
          clicked = true;
        }}
      />,
      container,
    );
    const btn = container.querySelector('button');
    expect(btn?.textContent).toContain('Clear filters');
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicked).toBe(true);
  });
});