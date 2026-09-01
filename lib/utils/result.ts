export type ActionResult = { ok: true } | { ok: false; error: string };

export function ok(): { ok: true } {
  return { ok: true };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}