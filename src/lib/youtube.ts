/** Extrai ID do vídeo e retorna URL de embed do YouTube */
export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url.trim()) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`
  }

  return null
}

export function isValidYoutubeUrl(url: string): boolean {
  return getYoutubeEmbedUrl(url) !== null
}
