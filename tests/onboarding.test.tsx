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

describe('Onboarding wizard (2-step activation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateTmdb.mockResolvedValue({ valid: true });
    mockValidateOmdb.mockResolvedValue({ valid: true });
  });

  it('shows welcome step with Begin', () => {
    render(<Onboarding onComplete={vi.fn()} />);

    expect(screen.getByText(/picture palace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^begin$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/step 1 of 2/i)).toBeInTheDocument();
  });

  it('blocks enter when TMDb validation fails', async () => {
    mockValidateTmdb.mockResolvedValue({
      valid: false,
      error: 'Invalid token. Use your TMDb API Read Access Token',
    });

    render(<Onboarding onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }));

    const input = screen.getByLabelText(/TMDb API Read Access Token/i);
    fireEvent.input(input, { target: { value: 'bad-key' } });
    fireEvent.click(screen.getByRole('button', { name: /validate & enter/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Read Access Token/i);
    });
    expect(mockValidateTmdb).toHaveBeenCalledWith('bad-key');
    expect(screen.getByRole('button', { name: /validate & enter/i })).toBeInTheDocument();
  });

  it('happy path with validated TMDb completes in two steps', async () => {
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }));

    fireEvent.input(screen.getByLabelText(/TMDb API Read Access Token/i), {
      target: { value: 'eyJ-valid-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /validate & enter/i }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(onComplete).toHaveBeenCalledWith({
      tmdbApiKey: 'eyJ-valid-token',
      llmEnabled: false,
    });
    expect(mockValidateTmdb).toHaveBeenCalledWith('eyJ-valid-token');
    // OMDb / LLM steps removed from FTUE
    expect(mockValidateOmdb).not.toHaveBeenCalled();
  });

  it('enter without keys completes immediately without validation', async () => {
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /^begin$/i }));
    fireEvent.click(screen.getByRole('button', { name: /enter without keys/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      tmdbApiKey: '',
      llmEnabled: false,
    });
    expect(mockValidateTmdb).not.toHaveBeenCalled();
  });
});
