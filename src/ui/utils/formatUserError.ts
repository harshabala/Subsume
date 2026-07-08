/** Turn unknown errors into a short user-facing string. */
export function formatUserError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Something went wrong';
  }
}