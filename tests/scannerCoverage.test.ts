import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/shared/messages', () => ({ sendMessage: vi.fn() }));

import {
  getPosterResolveCountForOrigin,
  scanPage,
  scanImages,
  startObserving,
  stopObserving,
  setImageScanConfig,
  resetPosterResolveBudgetForTests,
} from '@/content/scanner';
import { sendMessage } from '@/shared/messages';

const visible = <T extends Element>(el: T, w = 200, h = 300): T => {
  el.getBoundingClientRect = () => ({ width: w, height: h, top: 0, left: 0, right: w, bottom: h }) as DOMRect;
  return el;
};
const html = (markup: string) => {
  document.body.innerHTML = markup;
  document.body.querySelectorAll('*').forEach((el) => visible(el));
};
const match = (tmdbId = '1') => ({ success: true, data: { match: { tmdbId, title: 't' } } });

beforeEach(() => {
  document.body.innerHTML = '';
  resetPosterResolveBudgetForTests();
  vi.mocked(sendMessage).mockReset();
  vi.mocked(sendMessage).mockResolvedValue({ success: true, data: { match: null } } as never);
});
afterEach(() => {
  stopObserving();
  vi.useRealTimers();
});

describe('scanPage', () => {
  it('recognises every title pattern in image alt/title text', () => {
    html(`
      <main>
        <img alt="Heat (1995)">
        <img alt="Alien - 1979">
        <img alt="Solaris: 1972">
        <img alt="Dune (2021) — Part One">
        <img alt="The Wire (TV Series 2002–2008)">
        <img alt="Fargo (2014 TV series)">
        <img title="Arrival (2016)">
        <img alt="no year here">
        <img alt="Hidden (2000)" id="hidden">
        <img alt="Tagged (2000)" data-subsume-id="x">
        <img alt="" title="">
      </main>`);
    visible(document.getElementById('hidden')!, 0, 0);
    const titles = scanPage().map((t) => [t.title, t.yearGuess]);
    expect(titles).toEqual([
      ['Heat', 1995],
      ['Alien', 1979],
      ['Solaris', 1972],
      ['Dune', 2021],
      ['The Wire', 2002],
      ['Fargo', 2014],
      ['Arrival', 2016],
    ]);
  });

  it('detects platform and IMDb links, plus titled links near media keywords', () => {
    html(`
      <main>
        <p><a href="https://www.netflix.com/title/1">Stranger Things (2016)</a></p>
        <p><a href="https://www.imdb.com/title/tt1">Just a name</a></p>
        <p>A great movie: <a href="https://blog.test/x">Heat (1995)</a></p>
        <p>A great movie: <a href="https://blog.test/y">no pattern</a></p>
        <p>Recipes: <a href="https://blog.test/z">Soup (2020)</a></p>
        <p><a href="https://netflix.com">ab</a></p>
        <p><a href="https://netflix.com"></a></p>
        <p><a href="https://netflix.com">${'x'.repeat(81)}</a></p>
        <p><a href="https://netflix.com" data-subsume-id="done">Tagged (2000)</a></p>
        <nav><a href="https://netflix.com">In Nav (2000)</a></nav>
        <p><a href="https://netflix.com" id="hidden">Hidden (2000)</a></p>
      </main>`);
    visible(document.getElementById('hidden')!, 0, 0);
    const out = scanPage().map((t) => [t.title, t.yearGuess]);
    expect(out).toEqual([
      ['Stranger Things', 2016],
      ['Just a name', undefined],
      ['Heat', 1995],
    ]);
  });

  it('detects headings only with media context', () => {
    html(`
      <main>
        <section><h2>Heat (1995)</h2><p>A film by Michael Mann</p></section>
        <section><h3>Report (2020)</h3><p>quarterly numbers</p></section>
        <section><h1>Plain heading</h1><p>movie</p></section>
        <section><h4></h4><p>series</p></section>
        <section><h2 data-subsume-id="t">Tagged (1990)</h2><p>film</p></section>
        <section><h2 id="hidden">Hidden (1990)</h2><p>film</p></section>
        <header><h2>Header (1990)</h2><p>film</p></header>
      </main>`);
    visible(document.getElementById('hidden')!, 0, 0);
    expect(scanPage().map((t) => t.title)).toEqual(['Heat']);
  });
});

describe('startObserving', () => {
  it('scans added subtrees once, skipping nested, removed and ignored nodes', async () => {
    vi.useFakeTimers();
    html('<main id="root"></main>');
    const onDetected = vi.fn();
    startObserving(onDetected);
    startObserving(onDetected); // second call is a no-op

    const root = document.getElementById('root')!;
    const outer = visible(document.createElement('div'));
    outer.innerHTML = '<img alt="Heat (1995)"><div><img alt="Alien (1979)"></div>';
    outer.querySelectorAll('*').forEach((el) => visible(el));
    root.appendChild(outer);
    root.appendChild(document.createTextNode('text only'));
    root.appendChild(document.createElement('script'));
    const gone = visible(document.createElement('div'));
    gone.innerHTML = '<img alt="Gone (2000)">';
    root.appendChild(gone);
    await Promise.resolve();
    // Nested child added in a later batch while its parent is still pending
    const inner = outer.querySelector('div')!;
    const extra = visible(document.createElement('span'));
    inner.appendChild(extra);
    gone.remove();
    await Promise.resolve();

    vi.advanceTimersByTime(150);
    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected.mock.calls[0][0].map((t: { title: string }) => t.title)).toEqual(['Heat', 'Alien']);
  });

  it('does not report when added nodes contain no titles, and skips SKIP_TAGS-only batches', async () => {
    vi.useFakeTimers();
    const onDetected = vi.fn();
    startObserving(onDetected);
    document.body.appendChild(visible(document.createElement('div')));
    await Promise.resolve();
    vi.advanceTimersByTime(150);
    document.body.appendChild(document.createElement('style'));
    await Promise.resolve();
    vi.advanceTimersByTime(150);
    // Everything added then removed before the debounce fires
    const temp = visible(document.createElement('div'));
    document.body.appendChild(temp);
    await Promise.resolve();
    temp.remove();
    await Promise.resolve();
    vi.advanceTimersByTime(150);
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('debounces poster scans on added images using the configured sensitivity', async () => {
    vi.useFakeTimers();
    const onMatch = vi.fn();
    vi.mocked(sendMessage).mockResolvedValue(match('77') as never);
    startObserving(vi.fn());

    // No callback configured yet: image mutations do not schedule poster scans
    const early = visible(document.createElement('img'));
    early.src = 'https://image.tmdb.org/t/p/w500/1.jpg';
    document.body.appendChild(early);
    await Promise.resolve();
    vi.advanceTimersByTime(600);
    expect(sendMessage).not.toHaveBeenCalled();

    setImageScanConfig('high', onMatch, true);
    // A batch with no images schedules no poster scan
    document.body.appendChild(visible(document.createElement('p')));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);
    expect(sendMessage).not.toHaveBeenCalled();
    const img = visible(document.createElement('img'));
    img.src = 'https://image.tmdb.org/t/p/w500/77.jpg';
    document.body.appendChild(img);
    await Promise.resolve();
    const wrapper = visible(document.createElement('div'));
    const nested = visible(document.createElement('img'));
    nested.src = 'https://image.tmdb.org/t/p/w500/78.jpg';
    wrapper.appendChild(nested);
    document.body.appendChild(wrapper);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);
    expect(onMatch).toHaveBeenCalledTimes(2);
  });

  it('logs when a debounced poster scan fails, and stopObserving clears pending timers', async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    setImageScanConfig('medium', vi.fn());
    startObserving(vi.fn());
    const box = visible(document.createElement('div'));
    box.appendChild(visible(document.createElement('img')));
    const realQsa = box.querySelectorAll.bind(box);
    box.querySelectorAll = ((sel: string) => {
      // Only the poster scan queries plain 'img'; title scanning uses other selectors.
      if (sel === 'img') throw new Error('detached');
      return realQsa(sel);
    }) as never;
    document.body.appendChild(box);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);
    expect(err).toHaveBeenCalledWith('[Subsume] Debounced scanImages failed:', expect.any(Error));

    const later = visible(document.createElement('div'));
    later.innerHTML = '<img>';
    document.body.appendChild(later);
    await Promise.resolve();
    stopObserving();
    stopObserving();
    await vi.advanceTimersByTimeAsync(600);
    err.mockRestore();
  });
});

describe('scanImages', () => {
  it('reports zero resolves for an unseen origin', () => {
    expect(getPosterResolveCountForOrigin('https://never.test')).toBe(0);
  });

  const img = (attrs: Record<string, string>, parent: Element = document.body, size: [number, number] = [0, 0]) => {
    const el = document.createElement('img');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    visible(el, size[0], size[1]);
    parent.appendChild(el);
    return el;
  };
  const state = (el: Element) => el.getAttribute('data-subsume-poster-scanned');

  it('filters non-poster images', async () => {
    const nav = document.createElement('nav');
    document.body.appendChild(nav);
    const noSrc = img({ alt: 'x' });
    const data = img({ src: 'data:image/png;base64,xx', alt: 'Heat (1995) film' });
    const blob = img({ src: 'blob:abc', alt: 'Heat (1995) film' });
    const inNav = img({ src: 'https://image.tmdb.org/t/p/w500/1.jpg' }, nav);
    const done = img({ src: 'https://image.tmdb.org/t/p/w500/1.jpg', 'data-subsume-poster-scanned': 'skip' });
    const plain = img({ src: 'https://site.test/logo.png', alt: 'Logo' });
    const noAlt = img({ src: 'https://site.test/pixel.png' });
    await scanImages('high', vi.fn());
    for (const el of [noSrc, data, blob, inNav, plain, noAlt]) expect(state(el)).toBeNull();
    expect(state(done)).toBe('skip');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('picks strategies by CDN, catalog mode and sensitivity', async () => {
    const onMatch = vi.fn();
    vi.mocked(sendMessage).mockResolvedValue(match() as never);
    const p = document.createElement('p');
    p.textContent = 'Heat Mann';
    document.body.appendChild(p);

    // alt with year and >= 3 words
    const yearAlt = img({ src: 'https://site.test/a.jpg', alt: 'Heat The Movie (1995)' });
    // two-word alt echoed in nearby text
    const echoed = img({ src: 'https://site.test/b.jpg', alt: 'Heat Mann' }, p);
    // big enough image with a 4+ char alt
    const sized = img({ src: 'https://site.test/c.jpg', alt: 'Poster', width: '100', height: '150' });

    await scanImages('medium', onMatch);
    expect(state(yearAlt)).toBe('matched');
    expect(state(echoed)).toBe('skip');
    expect(state(sized)).toBe('skip');
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toEqual({ strategy: 'alt-text', query: 'Heat The Movie (1995)' });

    for (const el of [echoed, sized]) el.removeAttribute('data-subsume-poster-scanned');
    await scanImages('low', onMatch);
    expect(state(echoed)).toBe('skip');

    for (const el of [echoed, sized]) el.removeAttribute('data-subsume-poster-scanned');
    vi.mocked(sendMessage).mockClear();
    await scanImages('high', onMatch);
    expect(vi.mocked(sendMessage).mock.calls.map((c) => (c[1] as { strategy: string }).strategy)).toEqual(['alt-text', 'alt-text']);
  });

  it('two-word alt not echoed nearby walks at most two ancestors', async () => {
    const outer = document.createElement('div');
    outer.textContent = 'Far Away';
    const mid = document.createElement('div');
    const inner = document.createElement('div');
    outer.appendChild(mid);
    mid.appendChild(inner);
    document.body.appendChild(outer);
    const el = img({ src: 'https://site.test/x.jpg', alt: 'Far Away' }, inner);
    await scanImages('high', vi.fn());
    expect(state(el)).toBeNull();
  });

  it('catalog mode: poster-shaped images use alt text, or clamped ancestor text', async () => {
    vi.mocked(sendMessage).mockResolvedValue(match() as never);
    const card = document.createElement('div');
    card.innerHTML = '<span>The Grand Budapest Hotel</span>';
    document.body.appendChild(card);
    const withAlt = img({ src: 'https://cdn.test/1.jpg', alt: 'Budapest' }, card, [100, 150]);
    const noAlt = img({ src: 'https://cdn.test/2.jpg' }, card, [100, 150]);
    await scanImages('low', vi.fn(), document.body, { catalogMode: true });
    expect(state(withAlt)).toBe('matched');
    expect(state(noAlt)).toBe('matched');
    const queries = vi.mocked(sendMessage).mock.calls.map((c) => c[1]);
    expect(queries).toContainEqual({ strategy: 'alt-text', query: 'Budapest' });
    expect(queries).toContainEqual({ strategy: 'ancestor-text', query: 'The Grand Budapest Hotel' });
  });

  it('ancestor text: prefers the shortest ancestor, clamps to 60 chars, and skips thin text', async () => {
    vi.mocked(sendMessage).mockResolvedValue(match() as never);
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    outer.appendChild(inner);
    inner.textContent = 'Word '.repeat(20);
    outer.appendChild(document.createTextNode(' plus more outer words'));
    document.body.appendChild(outer);
    const long = img({ src: 'https://cdn.test/l.jpg' }, inner, [100, 150]);

    const thinBox = document.createElement('div');
    thinBox.textContent = 'x';
    document.body.appendChild(thinBox);
    const thin = img({ src: 'https://cdn.test/t.jpg' }, thinBox, [100, 150]);

    const empty = document.createElement('div');
    const emptier = document.createElement('div');
    empty.appendChild(emptier);
    document.body.appendChild(empty);
    const noText = img({ src: 'https://cdn.test/n.jpg' }, emptier, [100, 150]);

    await scanImages('high', vi.fn(), document.body, { catalogMode: true });
    const q = (vi.mocked(sendMessage).mock.calls[0][1] as { query: string }).query;
    expect(q.length).toBeLessThanOrEqual(60);
    expect(q.startsWith('Word Word')).toBe(true);
    expect(state(long)).toBe('matched');
    expect(state(thin)).toBe('skip');
    expect(state(noText)).toBe('skip');
  });

  it('high sensitivity without alt text uses ancestor text', async () => {
    const box = document.createElement('div');
    box.textContent = 'Blade Runner';
    document.body.appendChild(box);
    const el = img({ src: 'https://static.tvmaze.com/uploads/p.jpg' }, box);
    await scanImages('high', vi.fn());
    expect(vi.mocked(sendMessage).mock.calls[0][1]).toEqual({ strategy: 'ancestor-text', query: 'Blade Runner' });
    expect(state(el)).toBe('skip');
  });

  it('tmdb-cdn: infers movie/tv from the enclosing link and rejects unparseable ids', async () => {
    const link = (href: string) => {
      const a = document.createElement('a');
      a.href = href;
      document.body.appendChild(a);
      return a;
    };
    img({ src: 'https://image.tmdb.org/t/p/w500/11.jpg' }, link('https://www.themoviedb.org/movie/11'));
    img({ src: 'https://image.tmdb.org/t/p/w500/22.jpg' }, link('https://www.themoviedb.org/tv/22'));
    img({ src: 'https://image.tmdb.org/t/p/w500/33.jpg' }, link('https://www.themoviedb.org/person/33'));
    img({ src: 'https://image.tmdb.org/t/p/w500/44.jpg' });
    const trailing = img({ src: 'https://image.tmdb.org/t/p/w500/' });
    const noId = img({ src: 'https://image.tmdb.org/t/p/w500/.jpg' });
    const alpha = img({ src: 'https://image.tmdb.org/t/p/w500/abc.jpg' });
    await scanImages('low', vi.fn());
    expect(vi.mocked(sendMessage).mock.calls.map((c) => c[1])).toEqual([
      { strategy: 'tmdb-cdn', tmdbId: '11', mediaType: 'movie' },
      { strategy: 'tmdb-cdn', tmdbId: '22', mediaType: 'tv' },
      { strategy: 'tmdb-cdn', tmdbId: '33', mediaType: 'movie' },
      { strategy: 'tmdb-cdn', tmdbId: '44', mediaType: 'movie' },
    ]);
    for (const el of [trailing, noId, alpha]) expect(state(el)).toBe('skip');
  });

  it('scans the root image itself, batches in fives, and logs resolve failures', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const solo = img({ src: 'https://image.tmdb.org/t/p/w500/5.jpg' });
    await scanImages('low', vi.fn(), solo);
    expect(sendMessage).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '';
    resetPosterResolveBudgetForTests();
    vi.mocked(sendMessage).mockClear();
    vi.mocked(sendMessage).mockRejectedValueOnce(new Error('sw asleep'));
    const many = Array.from({ length: 6 }, (_, i) => img({ src: `https://image.tmdb.org/t/p/w500/${100 + i}.jpg` }));
    await scanImages('low', vi.fn());
    expect(sendMessage).toHaveBeenCalledTimes(6);
    expect(err).toHaveBeenCalledWith('[Subsume] Failed to resolve poster image:', expect.any(Error));
    expect(state(many[0])).toBe('skip');
    err.mockRestore();
  });
});
