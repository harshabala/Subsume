import { h, render } from 'preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Recommendations } from '@/ui/pages/Recommendations';
import { Search } from '@/ui/pages/Search';
import { NewReleases } from '@/ui/pages/NewReleases';

vi.mock('@/ui/components/RecommendationMediaCard', () => ({
  RecommendationMediaCard: () => <div class="sanctuary-media-card">Mock Card</div>
}));

vi.mock('@/ui/components/RecommendationAiCard', () => ({
  RecommendationAiCard: () => <div class="sanctuary-ai-card">Mock AI Card</div>
}));

describe('Discovery Pages Sanctuary Overhaul', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders Recommendations page with Velvet Obscura header', () => {
    render(<Recommendations />, container);
    expect(container.querySelector('.sanctuary-title')?.textContent).toContain('Recommendations');
  });

  it('renders Search page with archival search bar', () => {
    render(<Search />, container);
    expect(container.querySelector('.sanctuary-title')?.textContent).toContain('Search Archive');
  });

  it('renders NewReleases page with programme typography', () => {
    render(<NewReleases />, container);
    expect(container.querySelector('.sanctuary-title')?.textContent).toContain('Now Showing');
  });
});
