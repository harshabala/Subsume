import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/background/storage', () => ({
  getPreferences: vi.fn(),
  savePreferences: vi.fn(),
  getAllLibraryItems: vi.fn(),
}));

vi.mock('@/shared/activationMetrics', () => ({
  recordInscription: vi.fn().mockResolvedValue({}),
}));

import {
  getPreferences,
  savePreferences,
  getAllLibraryItems,
} from '@/background/storage';
import {
  onNewLibraryItemCreated,
  healFirstInscriptionIfLibraryNonEmpty,
} from '@/background/activationHooks';
import { recordInscription } from '@/shared/activationMetrics';

describe('activationHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('onNewLibraryItemCreated', () => {
    it('sets firstInscriptionComplete when false', async () => {
      vi.mocked(getPreferences).mockResolvedValue({
        firstInscriptionComplete: false,
      } as any);

      await onNewLibraryItemCreated();

      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ firstInscriptionComplete: true }),
      );
      expect(recordInscription).toHaveBeenCalled();
    });

    it('does not re-save when already complete', async () => {
      vi.mocked(getPreferences).mockResolvedValue({
        firstInscriptionComplete: true,
      } as any);

      await onNewLibraryItemCreated();

      expect(savePreferences).not.toHaveBeenCalled();
      expect(recordInscription).toHaveBeenCalled();
    });
  });

  describe('healFirstInscriptionIfLibraryNonEmpty', () => {
    it('heals when library has items and flag is false', async () => {
      vi.mocked(getPreferences).mockResolvedValue({
        firstInscriptionComplete: false,
      } as any);
      vi.mocked(getAllLibraryItems).mockResolvedValue([
        { mediaId: 'seed_1', status: 'watched', addedAt: 1, updatedAt: 1 },
      ] as any);

      const healed = await healFirstInscriptionIfLibraryNonEmpty();

      expect(healed).toBe(true);
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ firstInscriptionComplete: true }),
      );
    });

    it('does not heal when library is empty', async () => {
      vi.mocked(getPreferences).mockResolvedValue({
        firstInscriptionComplete: false,
      } as any);
      vi.mocked(getAllLibraryItems).mockResolvedValue([]);

      const healed = await healFirstInscriptionIfLibraryNonEmpty();

      expect(healed).toBe(false);
      expect(savePreferences).not.toHaveBeenCalled();
    });

    it('does not heal when already complete', async () => {
      vi.mocked(getPreferences).mockResolvedValue({
        firstInscriptionComplete: true,
      } as any);

      const healed = await healFirstInscriptionIfLibraryNonEmpty();

      expect(healed).toBe(false);
      expect(getAllLibraryItems).not.toHaveBeenCalled();
      expect(savePreferences).not.toHaveBeenCalled();
    });

    it('heals when flag is undefined and library non-empty', async () => {
      vi.mocked(getPreferences).mockResolvedValue({} as any);
      vi.mocked(getAllLibraryItems).mockResolvedValue([
        { mediaId: 'x', status: 'to-watch', addedAt: 1, updatedAt: 1 },
      ] as any);

      const healed = await healFirstInscriptionIfLibraryNonEmpty();

      expect(healed).toBe(true);
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ firstInscriptionComplete: true }),
      );
    });
  });
});
