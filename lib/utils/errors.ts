interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

/**
 * Maps PostgREST/PostgreSQL errors to messages a front-desk user can act on.
 * Concurrency-sensitive conflicts (exclusion violations) surface here instead
 * of being lost to a silent "query then insert" race.
 */
export function toErrorMessage(error: PostgrestErrorLike | null): string {
  if (!error) return 'Something went wrong.';

  switch (error.code) {
    case '23P01':
      return 'This time overlaps another slot or appointment for the same provider.';
    case '23505':
      return 'A conflicting record already exists (duplicate assignment).';
    case '23503':
      return 'A referenced record does not exist.';
    case '23514':
      return 'The change violates a data rule (check the required fields).';
    default:
      return error.message || 'Something went wrong.';
  }
}