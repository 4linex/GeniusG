/**
 * Garante que variáveis VITE_* do Cloudflare Pages cheguem ao Vite no build.
 * O Vite só embute env no bundle durante `vite build` — o .env local não vai pro Git.
 */
import { writeFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL?.trim()
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim()
const onCloudflare = Boolean(process.env.CF_PAGES)

if (onCloudflare) {
  if (!url || !key) {
    console.error(
      '\n[build] ERRO: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão disponíveis no build.\n' +
        'Cloudflare Pages → Settings → Variables and secrets → Production → confira os nomes exatos.\n' +
        'Depois: Deployments → Retry deployment.\n',
    )
    process.exit(1)
  }
  console.log(`[build] Supabase URL: ${url}`)
} else if (!url || !key) {
  console.warn(
    '[build] VITE_SUPABASE_* não definidas — use .env local ou variáveis do Cloudflare no deploy.',
  )
}

if (url || key) {
  writeFileSync(
    '.env.production.local',
    [
      '# Gerado em scripts/prepare-build-env.mjs — não commitar',
      url ? `VITE_SUPABASE_URL=${url}` : '',
      key ? `VITE_SUPABASE_ANON_KEY=${key}` : '',
    ]
      .filter(Boolean)
      .join('\n') + '\n',
  )
}
