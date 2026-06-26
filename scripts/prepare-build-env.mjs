/**
 * Garante que variáveis VITE_* do Cloudflare Pages cheguem ao Vite no build.
 * Não lê .env do repositório — configure no painel do Cloudflare (Preview + Production).
 */
import { writeFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL?.trim()
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim()
const onCloudflare = Boolean(process.env.CF_PAGES)

if (onCloudflare) {
  if (!url || !key) {
    const branch = process.env.CF_PAGES_BRANCH || '(desconhecida)'
    console.error(
      '\n[build] ERRO: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão no ambiente de build.\n' +
        `Branch: ${branch}\n\n` +
        'Cloudflare Pages → Settings → Environment variables:\n' +
        '  • Preview  — obrigatório para develop e outras branches\n' +
        '  • Production — obrigatório para main/master\n\n' +
        'Adicione em AMBOS os ambientes:\n' +
        '  VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co\n' +
        '  VITE_SUPABASE_ANON_KEY=sua_chave_anon\n\n' +
        'Não commite .env com chaves no Git. Depois: Deployments → Retry deployment.\n',
    )
    process.exit(1)
  }
  console.log(`[build] Supabase URL: ${url}`)
} else if (!url || !key) {
  console.warn(
    '[build] VITE_SUPABASE_* não definidas — use .env local (gitignored) ou variáveis no Cloudflare.',
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
