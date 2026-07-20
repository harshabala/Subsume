import { h } from 'preact';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';

function HelloSubsume() {
  return <div data-testid="hello-subsume">hello-subsume</div>;
}

describe('test infrastructure', () => {
  it('renders with @testing-library/preact', () => {
    render(<HelloSubsume />);
    expect(screen.getByTestId('hello-subsume')).toHaveTextContent(
      'hello-subsume',
    );
  });
});
