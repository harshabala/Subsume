import { describe, it, expect, beforeEach } from 'vitest';
import { scanPage } from '@/content/scanner';

describe('scanPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('detects title patterns in image alt text', () => {
    document.body.innerHTML = `
      <main>
        <img alt="Inception (2010)" src="https://example.com/poster.jpg" width="200" height="300" />
      </main>
    `;

    const img = document.querySelector('img')!;
    img.getBoundingClientRect = () =>
      ({ width: 200, height: 300, top: 0, left: 0, right: 200, bottom: 300 } as DOMRect);

    const results = scanPage();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Inception');
    expect(results[0].yearGuess).toBe(2010);
  });

  it('skips elements inside navigation zones', () => {
    document.body.innerHTML = `
      <nav>
        <img alt="Inception (2010)" src="https://example.com/poster.jpg" width="200" height="300" />
      </nav>
    `;

    const results = scanPage();
    expect(results).toHaveLength(0);
  });
});