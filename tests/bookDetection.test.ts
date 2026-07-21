import { describe, it, expect, beforeEach } from 'vitest';
import { detectBookCandidates, MIN_ANNOTATION_CONFIDENCE } from '@/content/bookDetection';
import { isValidIsbn13, isValidIsbn10 } from '@/shared/isbn';

/** Known-valid ISBN-13 (The Great Gatsby, Scribner). */
const VALID_ISBN13 = '9780743273565';
/** Known-valid ISBN-10. */
const VALID_ISBN10 = '0306406152';

function pageUrl(href: string): URL {
  return new URL(href);
}

describe('detectBookCandidates', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('JSON-LD Book + valid ISBN → high confidence', () => {
    document.head.innerHTML = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Book",
          "name": "The Great Gatsby",
          "author": { "@type": "Person", "name": "F. Scott Fitzgerald" },
          "isbn": "${VALID_ISBN13}",
          "image": "https://example.com/gatsby.jpg",
          "datePublished": "1925"
        }
      </script>
    `;
    document.body.innerHTML = `<h1>The Great Gatsby</h1>`;

    const results = detectBookCandidates(
      document,
      pageUrl('https://example.com/books/gatsby')
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    const top = results[0];
    expect(top.medium).toBe('book');
    expect(top.title).toMatch(/Great Gatsby/i);
    expect(top.authorOrCreator?.some((a) => /Fitzgerald/i.test(a))).toBe(true);
    expect(top.isbn13).toContain(VALID_ISBN13);
    expect(top.confidence).toBeGreaterThanOrEqual(0.85);
    expect(top.evidence.some((e) => e.type === 'json_ld')).toBe(true);
    expect(top.evidence.some((e) => e.type === 'isbn')).toBe(true);
  });

  it('random 13-digit non-ISBN is not detected as valid', () => {
    document.body.innerHTML = `
      <main>
        <p>Order confirmation 1234567890123 shipped today.</p>
        <p>Tracking 5555555555555 for your package.</p>
      </main>
    `;

    const results = detectBookCandidates(
      document,
      pageUrl('https://shop.example.com/orders/1')
    );

    for (const c of results) {
      for (const isbn of c.isbn13 || []) {
        expect(isValidIsbn13(isbn)).toBe(true);
        expect(isbn).not.toBe('1234567890123');
        expect(isbn).not.toBe('5555555555555');
      }
    }
    // No high-confidence book from bare tracking numbers
    expect(results.every((c) => (c.isbn13 || []).length === 0 || c.title)).toBe(true);
    expect(results.filter((c) => c.isbn13?.includes('1234567890123'))).toHaveLength(0);
  });

  it('invalid checksum ISBN is rejected', () => {
    const badIsbn = '9780743273560'; // wrong check digit for Gatsby
    expect(isValidIsbn13(badIsbn)).toBe(false);

    document.head.innerHTML = `
      <script type="application/ld+json">
        {
          "@type": "Book",
          "name": "Fake Book",
          "isbn": "${badIsbn}"
        }
      </script>
    `;
    document.body.innerHTML = `<p>ISBN ${badIsbn}</p>`;

    const results = detectBookCandidates(
      document,
      pageUrl('https://example.com/fake-book')
    );

    for (const c of results) {
      expect(c.isbn13 || []).not.toContain(badIsbn);
      for (const isbn of c.isbn13 || []) {
        expect(isValidIsbn13(isbn)).toBe(true);
      }
      for (const isbn of c.isbn10 || []) {
        expect(isValidIsbn10(isbn)).toBe(true);
      }
    }
  });

  it('title-only weak mention is low confidence or filtered', () => {
    document.body.innerHTML = `
      <article>
        <p>
          Yesterday I thought about Gatsby while walking home.
          No author, no ISBN, no review framing — just a word.
        </p>
      </article>
    `;

    const results = detectBookCandidates(
      document,
      pageUrl('https://blog.example.com/random-thoughts')
    );

    // Precision: bare prose mention must not produce a strong candidate
    const gatsby = results.filter((c) => /gatsby/i.test(c.title));
    for (const c of gatsby) {
      expect(c.confidence).toBeLessThan(0.85);
    }
    // Anything returned must clear the annotation floor
    for (const c of results) {
      expect(c.confidence).toBeGreaterThanOrEqual(MIN_ANNOTATION_CONFIDENCE);
    }
    // Prefer filtering title-only noise entirely
    expect(gatsby.every((c) => (c.authorOrCreator?.length ?? 0) > 0 || (c.isbn13?.length ?? 0) > 0)).toBe(
      true
    );
  });

  it('goodreads-like structure yields a book candidate', () => {
    document.head.innerHTML = `
      <meta property="og:title" content="The Catcher in the Rye" />
      <meta property="og:image" content="https://covers.example.com/catcher.jpg" />
      <script type="application/ld+json">
        {
          "@type": "Book",
          "name": "The Catcher in the Rye",
          "author": "J. D. Salinger",
          "isbn": "9780316769488"
        }
      </script>
    `;
    document.body.innerHTML = `
      <div id="bookTitle">The Catcher in the Rye</div>
      <a class="authorName" href="/author/show/1">J. D. Salinger</a>
      <div class="BookCover__image">
        <img src="https://covers.example.com/catcher.jpg" alt="cover" />
      </div>
      <p>ISBN-13: 978-0-316-76948-8</p>
    `;

    const results = detectBookCandidates(
      document,
      pageUrl('https://www.goodreads.com/book/show/5107.The_Catcher_in_the_Rye')
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    const top = results[0];
    expect(top.medium).toBe('book');
    expect(top.title).toMatch(/Catcher in the Rye/i);
    expect(top.confidence).toBeGreaterThanOrEqual(0.85);
    expect(
      top.evidence.some((e) => e.type === 'json_ld' || e.type === 'domain_adapter')
    ).toBe(true);
  });

  it('title by author heuristic produces mid-band confidence', () => {
    document.body.innerHTML = `
      <article>
        <h1>Book notes</h1>
        <p>
          I finally finished "Beloved" by Toni Morrison and cannot stop thinking
          about the ending.
        </p>
      </article>
    `;

    const results = detectBookCandidates(
      document,
      pageUrl('https://essays.example.com/beloved-notes')
    );

    const hit = results.find((c) => /beloved/i.test(c.title));
    expect(hit).toBeTruthy();
    expect(hit!.authorOrCreator?.some((a) => /Morrison/i.test(a))).toBe(true);
    expect(hit!.confidence).toBeGreaterThanOrEqual(MIN_ANNOTATION_CONFIDENCE);
    expect(hit!.confidence).toBeLessThan(0.85);
    expect(hit!.evidence.some((e) => e.type === 'title_author_text')).toBe(true);
  });

  it('valid ISBN-10 with book context is accepted and convertible', () => {
    expect(isValidIsbn10(VALID_ISBN10)).toBe(true);

    document.body.innerHTML = `
      <main>
        <p>This paperback book ISBN ${VALID_ISBN10} is a classic novel by the author.</p>
      </main>
    `;

    const results = detectBookCandidates(
      document,
      pageUrl('https://example.com/isbn-page')
    );

    const withIsbn = results.filter(
      (c) =>
        c.isbn10?.includes(VALID_ISBN10) ||
        (c.isbn13 || []).some((i) => i.startsWith('978'))
    );
    expect(withIsbn.length).toBeGreaterThanOrEqual(1);
    for (const c of withIsbn) {
      expect(c.confidence).toBeGreaterThanOrEqual(MIN_ANNOTATION_CONFIDENCE);
    }
  });
});
