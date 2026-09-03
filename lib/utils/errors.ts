/**
 * Maps database/Prisma errors to user-friendly messages.
 */
export function toErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong.';

  if (typeof error === 'string') return error;

  const err = error as { code?: string; message?: string };

  // Prisma known request errors
  if (err.code === 'P2002') {
    return 'A record with these unique details already exists.';
  }
  if (err.code === 'P2003') {
    return 'A referenced record does not exist.';
  }
  if (err.code === 'P2025') {
    return 'Record not found or already deleted.';
  }

  // Postgres codes
  switch (err.code) {
    case '23P01':
      return 'This time overlaps another slot or appointment for the same provider.';
    case '23505':
      return 'A conflicting record already exists (duplicate assignment).';
    case '23503':
      return 'A referenced record does not exist.';
    case '23514':
      return 'The change violates a data rule (check the required fields).';
    default:
      return err.message || 'Something went wrong.';
  }
}