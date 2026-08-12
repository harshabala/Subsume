import { h } from 'preact';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { FirstInscriptionGate } from '@/ui/components/FirstInscriptionGate';

describe('FirstInscriptionGate', () => {
  it('renders plain-English headline and CTAs', () => {
    render(<FirstInscriptionGate onNavigate={vi.fn()} onSkipLater={vi.fn()} />);

    expect(screen.getByTestId('first-inscription-gate')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /save your first reflection/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/private movie & book journal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search for a title/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i'll do this later/i })).toBeInTheDocument();
  });

  it('primary CTA navigates to search', () => {
    const onNavigate = vi.fn();
    render(<FirstInscriptionGate onNavigate={onNavigate} onSkipLater={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /search for a title/i }));
    expect(onNavigate).toHaveBeenCalledWith('search');
  });

  it('secondary CTA soft-skips', () => {
    const onSkipLater = vi.fn();
    render(<FirstInscriptionGate onNavigate={vi.fn()} onSkipLater={onSkipLater} />);

    fireEvent.click(screen.getByRole('button', { name: /i'll do this later/i }));
    expect(onSkipLater).toHaveBeenCalledTimes(1);
  });
});
