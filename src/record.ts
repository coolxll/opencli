/**
 * Stub module — record functionality not yet implemented.
 * TODO: Implement recordSession and renderRecordSummary.
 */
export async function recordSession(_opts?: Record<string, unknown>): Promise<{ candidateCount: number }> {
  throw new Error('record command is not yet implemented');
}

export function renderRecordSummary(_result: unknown): string {
  return 'record command is not yet implemented';
}
