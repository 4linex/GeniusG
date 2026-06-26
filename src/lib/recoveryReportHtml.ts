import { APP_NAME, APP_TAGLINE } from '@/lib/branding'
import {
  PERFORMANCE_LEVEL_COLORS,
  PERFORMANCE_LEVEL_LABELS,
  type AreaPerformanceRow,
  type RecoveryReportData,
} from '@/lib/recoveryReport'
import { parseSkillLabel } from '@/lib/skillBank'
import {
  buildReportComparativo,
  buildReportKpiCards,
  buildReportMetaFields,
  reportAreaChartTitle,
  reportBnccAreaRows,
  reportBnccRows,
  reportKindSubtitle,
  reportPageTitle,
  reportShowsSection,
} from '@/lib/recoveryReportLayout'

const PURPLE = '#7C3AED'
const BG = '#f1f5f9'
const CARD_BG = '#ffffff'
const CARD_BORDER = '#e2e8f0'
const TEXT = '#0f172a'
const BODY = '#334155'
const MUTED = '#64748b'
const DIM = '#94a3b8'
const TRACK = '#f1f5f9'
const BAR_PALETTE = ['#7C3AED', '#3b82f6', '#10b981', '#f59e0b', '#14b8a6', '#6366f1']

function esc(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function biCard(title: string, body: string, subtitle?: string) {
  return `
    <section style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:16px;padding:18px 20px;height:100%;box-sizing:border-box;box-shadow:0 10px 15px -3px rgba(0,0,0,0.2)">
      <h2 style="font-size:14px;font-weight:700;color:${TEXT};margin:0 0 ${subtitle ? '4px' : '14px'}">${esc(title)}</h2>
      ${subtitle ? `<p style="font-size:11px;color:${MUTED};margin:0 0 14px;line-height:1.4">${esc(subtitle)}</p>` : ''}
      ${body}
    </section>`
}

function kpiIcon(label: string, color: string) {
  const l = label.toLowerCase()
  let path = ''
  if (l.includes('desempenho')) {
    path = '<circle cx="11" cy="11" r="8"/><circle cx="11" cy="11" r="4"/><circle cx="11" cy="11" r="0.6" fill="currentColor"/>'
  } else if (l.includes('tri')) {
    path = '<polyline points="3,14 8,9 12,12 18,5" fill="none"/><polyline points="14,5 18,5 18,9" fill="none"/>'
  } else if (l.includes('crític')) {
    path = '<path d="M11 3 L20 18 L2 18 Z" fill="none"/><line x1="11" y1="9" x2="11" y2="13"/><circle cx="11" cy="16" r="0.6" fill="currentColor"/>'
  } else if (l.includes('competên')) {
    path = '<path d="M11 3a4 4 0 0 0-4 4v1a3 3 0 0 0 0 6v1a4 4 0 0 0 8 0v-1a3 3 0 0 0 0-6V7a4 4 0 0 0-4-4Z" fill="none"/>'
  } else {
    path = '<polyline points="3,15 8,10 12,13 19,5" fill="none"/><polyline points="14,5 19,5 19,10" fill="none"/>'
  }
  return `<span style="display:inline-flex;width:38px;height:38px;border-radius:12px;background:${color}26;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 22 22" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">${path}</svg></span>`
}

function renderKpis(data: RecoveryReportData) {
  const cards = buildReportKpiCards(data)
  const cells = cards
    .map(
      (kpi) => `
      <div style="flex:1;min-width:130px;background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:16px;padding:16px 18px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.2)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="min-width:0">
            <p style="font-size:10px;font-weight:500;color:${MUTED};margin:0;text-transform:uppercase;letter-spacing:0.04em">${esc(kpi.label)}</p>
            <p style="font-size:30px;font-weight:700;color:${TEXT};margin:8px 0 4px;letter-spacing:-0.02em;line-height:1">${esc(kpi.value)}</p>
            <p style="font-size:11px;color:${DIM};margin:0">${esc(kpi.subtitle)}</p>
          </div>
          ${kpiIcon(kpi.label, kpi.color)}
        </div>
      </div>`,
    )
    .join('')
  return `<div style="display:flex;gap:12px;flex-wrap:wrap">${cells}</div>`
}

function renderHighlights(data: RecoveryReportData) {
  if (!data.highlights?.length) return ''
  const items = data.highlights
    .map(
      (h, i) => `
      <li style="display:flex;gap:10px;font-size:11px;color:${BODY};line-height:1.5;margin-bottom:8px">
        <span style="width:22px;height:22px;border-radius:50%;background:${PURPLE};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
        ${esc(h)}
      </li>`,
    )
    .join('')
  return biCard('Destaques da Análise', `<ul style="list-style:none;margin:0;padding:0">${items}</ul>`)
}

function renderMetaGrid(data: RecoveryReportData) {
  const fields = buildReportMetaFields(data)
  const cells = fields
    .map(
      (f) => `
      <div style="flex:1;min-width:140px;padding:12px 14px;background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:12px">
        <p style="font-size:9px;color:${MUTED};text-transform:uppercase;letter-spacing:0.05em;margin:0">${esc(f.label)}</p>
        <p style="font-size:12px;font-weight:600;color:${TEXT};margin:4px 0 0">${esc(f.value)}</p>
      </div>`,
    )
    .join('')
  return `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">${cells}</div>`
}

function renderStrongSkills(data: RecoveryReportData) {
  const skills = data.strongSkills ?? []
  if (skills.length === 0) return ''
  const body = `<ul style="margin:0;padding:0;list-style:none">${skills
    .map(
      (skill) =>
        `<li style="font-size:10px;color:${BODY};margin-bottom:6px;padding-left:12px;position:relative"><span style="position:absolute;left:0;top:5px;width:6px;height:6px;border-radius:50%;background:#10b981"></span>${esc(skill)}</li>`,
    )
    .join('')}</ul>`
  return biCard('Desempenho Positivo', body, 'Habilidades com bom desempenho (≥70%)')
}

function renderAreaBars(data: RecoveryReportData) {
  const rows = data.areaRows
  if (rows.length === 0) return ''
  const title = reportAreaChartTitle(data.kind)
  const subtitle =
    data.kind === 'student'
      ? 'Classificação: alto (≥70%), médio (40–69%), baixo (<40%)'
      : undefined
  const items = rows.slice(0, 8)
  const bars = items
    .map((row, i) => {
      const color = BAR_PALETTE[i % BAR_PALETTE.length]
      const w = Math.max(2, row.percentage)
      const rawLabel = row.detail ? `${row.label} · ${row.detail}` : row.label
      const label = rawLabel.length > 32 ? `${esc(rawLabel.slice(0, 30))}…` : esc(rawLabel)
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="width:120px;font-size:10px;color:${BODY};text-align:right;flex-shrink:0">${label}</span>
          <div style="flex:1;height:14px;background:${TRACK};border-radius:9999px;overflow:hidden">
            <div style="height:100%;width:${w}%;background:${color};border-radius:9999px"></div>
          </div>
          <span style="width:38px;font-size:11px;font-weight:700;color:${TEXT};text-align:right">${row.percentage}%</span>
        </div>`
    })
    .join('')
  return biCard(title, bars, subtitle)
}

function renderNivelDonut(data: RecoveryReportData) {
  const segments = data.nivelDistribution?.filter((s) => s.count > 0) ?? []
  if (segments.length === 0) return ''

  const size = 130
  const stroke = 20
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.count, 0)
  let offset = 0

  const arcs = segments
    .map((seg) => {
      const segLen = (seg.count / total) * circumference
      const dash = `${segLen} ${circumference - segLen}`
      const arc = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" />`
      offset += segLen
      return arc
    })
    .join('')

  const legend = segments
    .map(
      (seg) => `
      <li style="display:flex;justify-content:space-between;font-size:11px;color:${BODY};margin-bottom:8px">
        <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${seg.color};margin-right:7px"></span>${esc(seg.label)}</span>
        <strong style="color:${TEXT}">${seg.percentage}%</strong>
      </li>`,
    )
    .join('')

  return biCard(
    'Distribuição dos Alunos por Nível',
    `<div style="display:flex;align-items:center;gap:18px">
      <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0">
        <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${TRACK}" stroke-width="${stroke}" />
          ${arcs}
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span style="font-size:24px;font-weight:700;color:${TEXT}">${total}</span>
          <span style="font-size:9px;color:${MUTED}">respostas</span>
        </div>
      </div>
      <ul style="list-style:none;margin:0;padding:0;flex:1">${legend}</ul>
    </div>`,
  )
}

function renderBloom(data: RecoveryReportData) {
  const rows = data.bloomRows ?? []
  if (rows.length === 0) return ''
  const bars = rows
    .map((row) => {
      const w = Math.max(2, row.percentage)
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:11px">
          <span style="width:88px;font-size:10px;color:${BODY};text-align:right;flex-shrink:0">${esc(row.label)}</span>
          <div style="flex:1;height:12px;background:${TRACK};border-radius:9999px;overflow:hidden">
            <div style="height:100%;width:${w}%;background:${PURPLE};border-radius:9999px"></div>
          </div>
          <strong style="width:36px;font-size:11px;color:${TEXT};text-align:right">${row.percentage}%</strong>
        </div>`
    })
    .join('')
  return biCard('Desempenho por Taxonomia de Bloom', bars)
}

function priorityBadge(priority: 'alta' | 'media' | 'baixa') {
  const s = {
    alta: ['#DC2626', '#FEE2E2'],
    media: ['#D97706', '#FEF3C7'],
    baixa: ['#059669', '#D1FAE5'],
  }[priority]
  const label = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }[priority]
  return `<span style="font-size:9px;font-weight:600;padding:2px 8px;border-radius:9999px;color:${s[0]};background:${s[1]}">${label}</span>`
}

function renderCriticalSkills(data: RecoveryReportData) {
  const rows = data.criticalSkillsTable ?? []
  if (rows.length === 0) {
    return biCard('Habilidades Críticas', `<p style="font-size:11px;color:${MUTED};margin:0">Nenhuma habilidade crítica identificada.</p>`)
  }
  const body = `
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead><tr style="color:${MUTED}">
        <th style="text-align:left;padding:4px 6px;font-weight:600">Código</th>
        <th style="text-align:left;padding:4px 6px;font-weight:600">Habilidade</th>
        <th style="text-align:left;padding:4px 6px;font-weight:600;width:52px">%</th>
        <th style="text-align:left;padding:4px 6px;font-weight:600;width:52px">Prio.</th>
      </tr></thead>
      <tbody>${rows.map((row, i) => `
        <tr style="background:${i % 2 ? '#f8fafc' : 'transparent'}">
          <td style="padding:7px 6px;font-weight:600;color:${PURPLE}">${esc(row.code)}</td>
          <td style="padding:7px 6px;color:${BODY}">${esc(row.description.slice(0, 48))}${row.description.length > 48 ? '…' : ''}</td>
          <td style="padding:7px 6px;font-weight:600;color:${TEXT}">${row.percentage}%</td>
          <td style="padding:7px 6px">${priorityBadge(row.priority)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`
  return biCard('Habilidades Críticas', body, 'Déficits de aprendizagem (<60%)')
}

function renderComparativo(data: RecoveryReportData) {
  const rows = buildReportComparativo(data)
  if (rows.length === 0) return ''
  const maxW = 100
  const body = rows
    .map((row) => {
      const maxVal = Math.max(row.scopeValue, row.referenceValue, 1)
      const isPercent = row.label.includes('Desempenho')
      const scopeW = Math.min(maxW, (row.scopeValue / maxVal) * maxW)
      const refW = Math.min(maxW, (row.referenceValue / maxVal) * maxW)
      const fmt = (v: number) => (isPercent ? `${v}%` : String(v))
      return `
        <div style="margin-bottom:14px">
          <p style="font-size:11px;font-weight:600;color:${TEXT};margin:0 0 8px">${esc(row.label)}</p>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:9px;font-weight:600;color:${PURPLE};width:48px">${esc(row.scopeLabel)}</span>
            <div style="flex:1;height:10px;background:${TRACK};border-radius:9999px;overflow:hidden">
              <div style="height:100%;width:${scopeW}%;background:${PURPLE};border-radius:9999px"></div>
            </div>
            <span style="font-size:10px;font-weight:700;width:40px;text-align:right;color:${TEXT}">${fmt(row.scopeValue)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:9px;font-weight:600;color:${MUTED};width:48px">${esc(row.referenceLabel)}</span>
            <div style="flex:1;height:10px;background:${TRACK};border-radius:9999px;overflow:hidden">
              <div style="height:100%;width:${refW}%;background:#64748b;border-radius:9999px"></div>
            </div>
            <span style="font-size:10px;font-weight:600;width:40px;text-align:right;color:${MUTED}">${fmt(row.referenceValue)}</span>
          </div>
        </div>`
    })
    .join('')
  return biCard('Comparativo', body, `${rows[0]?.scopeLabel ?? 'Recorte'} vs ${rows[0]?.referenceLabel ?? 'referência'}`)
}

function competencyTable(rows: AreaPerformanceRow[], title: string, accent: string, headerLabel: string) {
  if (rows.length === 0) return ''
  const body = `
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead><tr style="color:${MUTED}">
        <th style="text-align:left;padding:6px 8px;width:60px;font-weight:600">Código</th>
        <th style="text-align:left;padding:6px 8px;font-weight:600">${esc(headerLabel)}</th>
        <th style="text-align:left;padding:6px 8px;width:120px;font-weight:600">Desempenho</th>
        <th style="text-align:left;padding:6px 8px;width:96px;font-weight:600">Situação</th>
      </tr></thead>
      <tbody>${rows.slice(0, 10).map((row, i) => {
        const { code, description } = parseSkillLabel(row.label)
        return `
        <tr style="background:${i % 2 ? '#f8fafc' : 'transparent'}">
          <td style="padding:8px;font-weight:700;color:${accent}">${esc(code || '—')}</td>
          <td style="padding:8px;color:${BODY}">${esc(description || row.label)}</td>
          <td style="padding:8px">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;height:7px;background:${TRACK};border-radius:9999px;overflow:hidden">
                <div style="height:100%;width:${row.percentage}%;background:${accent}"></div>
              </div>
              <span style="font-weight:700;min-width:32px;color:${TEXT}">${row.percentage}%</span>
            </div>
          </td>
          <td style="padding:8px;font-size:9px;font-weight:600;color:${PERFORMANCE_LEVEL_COLORS[row.level]}">${PERFORMANCE_LEVEL_LABELS[row.level]}</td>
        </tr>`
      }).join('')}
      </tbody>
    </table>`
  return biCard(title, body)
}

function renderBnccArea(data: RecoveryReportData) {
  const rows = reportBnccAreaRows(data)
  if (rows.length === 0) return ''
  const bars = rows
    .map((row, i) => {
      const color = BAR_PALETTE[i % BAR_PALETTE.length]
      const w = Math.max(2, row.percentage)
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="width:150px;font-size:10px;color:${BODY};text-align:right;flex-shrink:0">${esc(row.label)} <span style="color:${DIM}">(${row.count})</span></span>
          <div style="flex:1;height:14px;background:${TRACK};border-radius:9999px;overflow:hidden">
            <div style="height:100%;width:${w}%;background:${color};border-radius:9999px"></div>
          </div>
          <span style="width:38px;font-size:11px;font-weight:700;color:${TEXT};text-align:right">${row.percentage}%</span>
        </div>`
    })
    .join('')
  return biCard('Desempenho por Área do Conhecimento (BNCC)', bars, 'Média de acerto das habilidades BNCC agrupadas por componente curricular.')
}

function renderBncc(data: RecoveryReportData) {
  return competencyTable(reportBnccRows(data), 'Desempenho por Competência (BNCC)', PURPLE, 'Habilidade BNCC')
}

function renderSaebCompetency(data: RecoveryReportData) {
  return competencyTable(data.saebRows ?? [], 'Desempenho por Descritor (SAEB)', '#3b82f6', 'Descritor SAEB')
}

function renderSaebErrors(data: RecoveryReportData) {
  const rows = data.errorDescriptors ?? []
  if (rows.length === 0) return ''
  const body = `
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead><tr style="color:${MUTED}">
        <th style="text-align:left;padding:6px 8px;width:56px;font-weight:600">Código</th>
        <th style="text-align:left;padding:6px 8px;font-weight:600">Conteúdo</th>
        <th style="text-align:left;padding:6px 8px;width:110px;font-weight:600">% Erro</th>
      </tr></thead>
      <tbody>${rows.map((row, i) => `
        <tr style="background:${i % 2 ? '#f8fafc' : 'transparent'}">
          <td style="padding:8px;font-weight:600;color:#DC2626">${esc(row.code)}</td>
          <td style="padding:8px;color:${BODY}">${esc(row.description.slice(0, 50))}</td>
          <td style="padding:8px">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;height:8px;background:#fee2e2;border-radius:9999px;overflow:hidden">
                <div style="height:100%;width:${row.errorRate}%;background:#ef4444"></div>
              </div>
              <strong style="color:#DC2626">${row.errorRate}%</strong>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`
  return biCard('Descritores com Maior Índice de Erro', body)
}

function renderTri(data: RecoveryReportData) {
  if (!data.triSummary?.length) return ''
  const body = `
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead><tr style="color:${MUTED}">
        <th style="text-align:left;padding:6px 8px;font-weight:600">Avaliação</th>
        <th style="padding:6px 8px;font-weight:600">θ</th>
        <th style="padding:6px 8px;font-weight:600">TCT</th>
        <th style="padding:6px 8px;font-weight:600">N</th>
      </tr></thead>
      <tbody>${data.triSummary.map((row, i) => `
        <tr style="background:${i % 2 ? '#f8fafc' : 'transparent'}">
          <td style="padding:8px;color:${BODY}">${esc(row.label)}</td>
          <td style="padding:8px;font-weight:700;color:${PURPLE}">${row.averageTheta?.toFixed(2) ?? '—'}</td>
          <td style="padding:8px;color:${TEXT}">${row.averageTct}%</td>
          <td style="padding:8px;color:${TEXT}">${row.totalResponses}</td>
        </tr>`).join('')}
      </tbody>
    </table>`
  return biCard('Proficiência TRI (θ) por Avaliação', body)
}

function renderTrailRanking(data: RecoveryReportData) {
  const rows = data.trailRanking ?? []
  if (!rows.length) return ''
  const body = `
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead><tr style="color:${MUTED}">
        <th style="padding:6px 8px;width:28px;font-weight:600">#</th>
        <th style="text-align:left;padding:6px 8px;font-weight:600">Trilha</th>
        <th style="padding:6px 8px;font-weight:600">Faixa</th>
        <th style="padding:6px 8px;font-weight:600">Alunos</th>
      </tr></thead>
      <tbody>${rows.map((row, i) => `
        <tr style="background:${i % 2 ? '#f8fafc' : 'transparent'}">
          <td style="padding:8px;font-weight:700;color:${PURPLE}">${row.rank}</td>
          <td style="padding:8px;font-weight:500;color:${TEXT}">${esc(row.title)}</td>
          <td style="padding:8px;color:${MUTED}">${esc(row.percentRange)}</td>
          <td style="padding:8px;font-weight:600;color:${TEXT}">${row.studentCount}</td>
        </tr>`).join('')}
      </tbody>
    </table>`
  return biCard('Ranking de Trilhas em Uso', body, 'Trilhas de recomposição atribuídas, ordenadas por alunos.')
}

function renderStudentTrail(data: RecoveryReportData) {
  const trails = data.recommendedTrails ?? []
  if (!trails.length) return ''
  const body = trails
    .map(
      (row) => `
      <div style="border:1px solid ${PURPLE}66;border-radius:12px;padding:14px;margin-bottom:10px;background:rgba(139,92,246,0.10)">
        <p style="font-size:10px;color:${MUTED};margin:0 0 4px">Formulário: <strong style="color:${BODY}">${esc(row.formTitle || '—')}</strong> · TCT: <strong style="color:${PURPLE}">${row.studentPercent ?? '—'}%</strong></p>
        <p style="font-size:15px;font-weight:700;color:${TEXT};margin:0">${esc(row.trailTitle)}</p>
        <p style="font-size:10px;color:${MUTED};margin:4px 0 0">Faixa: ${esc(row.percentRange || '—')}</p>
        ${row.pedagogicalObjectives ? `<p style="font-size:10px;color:${BODY};margin:8px 0 0"><strong>Objetivos:</strong> ${esc(row.pedagogicalObjectives)}</p>` : ''}
        ${row.teacherNotes ? `<p style="font-size:10px;color:${BODY};margin:4px 0 0"><strong>Orientações:</strong> ${esc(row.teacherNotes)}</p>` : ''}
      </div>`,
    )
    .join('')
  return biCard('Trilha de Recomposição Recomendada', body, 'Trilha indicada com base no desempenho do aluno.')
}

function renderFormTrails(data: RecoveryReportData) {
  const trails = data.recommendedTrails ?? []
  if (!trails.length) return ''
  const body = trails
    .slice(0, 6)
    .map(
      (row) => `
      <div style="border:1px solid ${CARD_BORDER};border-radius:10px;padding:10px;margin-bottom:8px;background:#f8fafc">
        <p style="font-size:10px;color:${BODY};margin:0"><strong style="color:${TEXT}">${esc(row.studentName || '—')}</strong> · ${row.studentPercent ?? '—'}% · ${esc(row.trailTitle)}</p>
      </div>`,
    )
    .join('')
  return biCard('Trilhas Atribuídas no Formulário', body)
}

function renderEvolution(data: RecoveryReportData) {
  const points = data.evolutionSeries ?? []
  if (points.length < 2) return ''
  const w = 240
  const h = 120
  const padX = 24
  const padY = 16
  const max = Math.max(...points.map((p) => p.value), 100)
  const min = Math.min(...points.map((p) => p.value), 0)
  const range = max - min || 1
  const stepX = (w - padX * 2) / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = padX + i * stepX
    const y = padY + (1 - (p.value - min) / range) * (h - padY * 2)
    return { x, y, ...p }
  })
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const dots = coords
    .map(
      (c) =>
        `<circle cx="${c.x}" cy="${c.y}" r="3.5" fill="#ffffff" stroke="${PURPLE}" stroke-width="2" />
         <text x="${c.x}" y="${c.y - 8}" text-anchor="middle" font-size="9" font-weight="700" fill="${TEXT}">${c.value}%</text>
         <text x="${c.x}" y="${h - 2}" text-anchor="middle" font-size="8" fill="${MUTED}">${esc(c.label)}</text>`,
    )
    .join('')
  const delta = data.evolutionDelta
  const subtitle =
    delta != null ? `Variação no período: ${delta > 0 ? '+' : ''}${delta}%` : undefined
  return biCard(
    'Evolução do Desempenho',
    `<svg width="100%" viewBox="0 0 ${w} ${h}" style="max-width:${w}px">
      <polyline fill="none" stroke="${PURPLE}" stroke-width="2.5" points="${line}" />
      ${dots}
    </svg>`,
    subtitle,
  )
}

function renderRecommendations(data: RecoveryReportData) {
  const items = (data.recommendations ?? [])
    .map(
      (r, i) => `
      <li style="display:flex;gap:8px;font-size:11px;color:${BODY};line-height:1.45;margin-bottom:8px">
        <span style="width:20px;height:20px;border-radius:6px;background:rgba(139,92,246,0.18);color:${PURPLE};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
        ${esc(r)}
      </li>`,
    )
    .join('')
  return biCard('Recomendações', `<ul style="list-style:none;margin:0;padding:0">${items}</ul>`)
}

function renderExecutiveSummary(data: RecoveryReportData) {
  if (!data.executiveSummary) return ''
  return biCard(
    'Resumo Executivo',
    `<p style="font-size:11px;color:${BODY};line-height:1.65;margin:0">${esc(data.executiveSummary)}</p>`,
  )
}

function row2(a: string, b: string) {
  if (!a && !b) return ''
  return `<div style="display:flex;gap:14px;flex-wrap:wrap">
    ${a ? `<div style="flex:1;min-width:280px">${a}</div>` : ''}
    ${b ? `<div style="flex:1;min-width:280px">${b}</div>` : ''}
  </div>`
}

function row3(a: string, b: string, c: string) {
  const parts = [a, b, c].filter(Boolean)
  if (!parts.length) return ''
  return `<div style="display:flex;gap:14px;flex-wrap:wrap">
    ${parts.map((p) => `<div style="flex:1;min-width:200px">${p}</div>`).join('')}
  </div>`
}

export function buildRecoveryReportHtml(data: RecoveryReportData): string {
  const kind = data.kind
  const show = (section: Parameters<typeof reportShowsSection>[1]) =>
    reportShowsSection(kind, section)

  const parts: string[] = []

  if (show('highlights')) {
    const h = renderHighlights(data)
    if (h) parts.push(h)
  }
  if (show('kpis')) parts.push(renderKpis(data))
  if (show('studentTrail')) {
    const t = renderStudentTrail(data)
    if (t) parts.push(t)
  }

  const areaBars = show('areaBars') ? renderAreaBars(data) : ''
  const nivelDonut = show('nivelDonut') ? renderNivelDonut(data) : ''
  if (areaBars || nivelDonut) parts.push(row2(areaBars, nivelDonut))

  if (show('bnccArea')) {
    const a = renderBnccArea(data)
    if (a) parts.push(a)
  }

  const strong = show('strongSkills') ? renderStrongSkills(data) : ''
  const bloom = show('bloom') ? renderBloom(data) : ''
  const critical = show('criticalSkills') ? renderCriticalSkills(data) : ''
  const comparativo = show('comparativo') ? renderComparativo(data) : ''
  if (strong || bloom || critical || comparativo) parts.push(row3(strong || bloom, critical, comparativo))

  const bncc = show('bncc') ? renderBncc(data) : ''
  const saeb = show('saeb') ? renderSaebCompetency(data) : ''
  const errors = show('saebErrors') ? renderSaebErrors(data) : ''
  if (bncc || saeb || errors) {
    parts.push(row3(bncc, saeb, errors))
  }

  if (show('tri')) {
    const t = renderTri(data)
    if (t) parts.push(t)
  }
  if (show('trailRanking')) {
    const t = renderTrailRanking(data)
    if (t) parts.push(t)
  }
  if (show('formTrails')) {
    const t = renderFormTrails(data)
    if (t) parts.push(t)
  }

  const evolution = show('evolution') ? renderEvolution(data) : ''
  const rec = show('recommendations') ? renderRecommendations(data) : ''
  const exec = show('executiveSummary') ? renderExecutiveSummary(data) : ''
  if (evolution || rec || exec) parts.push(row3(evolution, rec, exec))

  return `<div id="recovery-report-document" style="width:794px;min-height:1123px;background:${BG};color:${TEXT};font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
    <div style="height:4px;background:linear-gradient(90deg,#6d28d9,${PURPLE},#4f46e5)"></div>
    <div style="background:#ffffff;border-bottom:1px solid ${CARD_BORDER};padding:24px 26px 18px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px">
        <div>
          <p style="font-size:10px;color:${MUTED};margin:0 0 6px">${APP_NAME} · ${APP_TAGLINE}</p>
          <h1 style="font-size:22px;font-weight:800;color:${TEXT};margin:0;letter-spacing:-0.02em">${esc(reportPageTitle(kind))}</h1>
          <p style="font-size:11px;color:${MUTED};margin:6px 0 0">${esc(reportKindSubtitle(kind))}</p>
        </div>
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#4f46e5);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800">G</div>
      </div>
      ${renderMetaGrid(data)}
    </div>

    <div style="padding:18px 20px 26px;display:flex;flex-direction:column;gap:14px">
      ${parts.join('')}
    </div>

    <div style="background:#ffffff;border-top:1px solid ${CARD_BORDER};padding:14px 24px;text-align:center">
      <p style="font-size:9px;color:${MUTED};margin:0">Relatório gerado automaticamente · ${APP_NAME}</p>
    </div>
  </div>`
}
