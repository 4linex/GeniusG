/** PostgREST rejeita URLs longas quando `.in()` tem muitos UUIDs (erro "URI too long"). */
export const IN_QUERY_CHUNK_SIZE = 40

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function fetchAllInBatches<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>,
  chunkSize = IN_QUERY_CHUNK_SIZE,
): Promise<T[]> {
  if (ids.length === 0) return []
  const chunks = chunkArray(ids, chunkSize)
  const results = await Promise.all(chunks.map(fetchChunk))
  return results.flat()
}
