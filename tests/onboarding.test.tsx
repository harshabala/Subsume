import { h } from 'preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { Onboarding } from '@/ui/pages/Onboarding';

vi.mock('@/ui/lib/validateKeys', () => ({
  validateTmdbKey: vi.fn(),
  validateOmdbKey: vi.fn(),
}));

import { validateTmdbKey, validateOmdbKey } from '@/ui/lib/validateKeys';

const mockValidateTmdb = vi.mocked(validateTmdbKey);
const mockValidateOmdb = vi.mocked(validateOmdbKey);

describe('Onboarding wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateTmdb.mockResolvedValue({ valid: true });
    mockValidateOmdb.mockResolvedValue({ valid: true });
  });

  it('shows welcome step with Start setup', () => {
    render(<Onboarding onComplete={vi.fn()} />);

    expect(screen.getByText(/picture palace/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start setup/i }),
    ).toBeInTheDocument();
  });

  it('blocks advance when TMDb validation fails', async () => {
    mockValidateTmdb.mockResolvedValue({
      valid: false,
      error: 'Invalid token. Use your TMDb API Read Access Token',
    });

    render(<Onboarding onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /start setup/i }));

    const input = screen.getByLabelText(/TMDb API Read Access Token/i);
    fireEvent.input(input, { target: { value: 'bad-key' } });
    fireEvent.click(
      screen.getByRole('button', { name: /validate & continue/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Read Access Token/i);
    });
    expect(mockValidateTmdb).toHaveBeenCalledWith('bad-key');
    // Still on TMDb step
    expect(
      screen.getByRole('button', { name: /validate & continue/i }),
    ).toBeInTheDocument();
  });

  it('happy path with skips calls onComplete with tmdb key and llmEnabled false', async () => {
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /start setup/i }));

    fireEvent.input(screen.getByLabelText(/TMDb API Read Access Token/i), {
      target: { value: 'eyJ-valid-token' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /validate & continue/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(/OMDb API key/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/^Provider$/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /enter the house/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /enter the house/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      tmdbApiKey: 'eyJ-valid-token',
      llmEnabled: false,
    });
    expect(mockValidateTmdb).toHaveBeenCalledWith('eyJ-valid-token');
    expect(mockValidateOmdb).not.toHaveBeenCalled();
  });
});
