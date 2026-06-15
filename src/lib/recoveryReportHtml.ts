import { APP_NAME, APP_TAGLINE } from '@/lib/branding'
import {
  PERFORMANCE_LEVEL_COLORS,
  PERFORMANCE_LEVEL_LABELS,
  type RecoveryReportData,
} from '@/lib/recoveryReport'

function esc(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function donutSvg(percentage: number, breakdown: RecoveryReportData['performanceBreakdown']) {
  const size = 140
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const segments = breakdown.filter((b) => b.count > 0)

  const arcs = segments
    .map((seg) => {
      const segLen = (seg.percentage / 100) * circumference
      const dash = `${segLen} ${circumference - segLen}`
      const arc = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${PERFORMANCE_LEVEL_COLORS[seg.level]}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" />`
      offset += segLen
      return arc
    })
    .join('')

  return `
    <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0">
      <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="${stroke}" />
        ${arcs}
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <span style="font-size:28px;font-weight:700;color:#1f2937">${percentage}%</span>
        <span style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Desempenho</span>
      </div>
    </div>`
}

function progressBar(percentage: number, level: keyof typeof PERFORMANCE_LEVEL_COLORS) {
  return `
    <div style="display:flex;align-items:center;gap:8px;flex:1">
      <div style="height:8px;border-radius:9999px;background:#f3f4f6;overflow:hidden;flex:1;min-width:80px">
        <div style="height:100%;border-radius:9999px;width:${Math.min(100, percentage)}%;background:${PERFORMANCE_LEVEL_COLORS[level]}"></div>
      </div>
      <span style="font-weight:600;color:#374151;width:32px;font-size:11px">${percentage}%</span>
    </div>`
}

function legendDot(level: keyof typeof PERFORMANCE_LEVEL_COLORS) {
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${PERFORMANCE_LEVEL_COLORS[level]};flex-shrink:0"></span>`
}

function areaTable(title: string, rows: RecoveryReportData['areaRows'], headerBg: string, headerColor: string) {
  if (rows.length === 0) return ''
  const body = rows
    .map(
      (row, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
      <td style="padding:10px 20px;font-size:11px">
        <div style="font-weight:500;color:#1f2937">${esc(row.label)}</div>
        ${row.detail ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px">${esc(row.detail)}</div>` : ''}
      </td>
      <td style="padding:10px 12px;width:160px">${progressBar(row.percentage, row.level)}</td>
      <td style="padding:10px 20px;width:110px">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:500;padding:2px 8px;border-radius:9999px;color:${PERFORMANCE_LEVEL_COLORS[row.level]};background:${PERFORMANCE_LEVEL_COLORS[row.level]}18">
          ${legendDot(row.level)} ${PERFORMANCE_LEVEL_LABELS[row.level]}
        </span>
      </td>
    </tr>`,
    )
    .join('')

  return `
    <section style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;margin-bottom:24px">
      <h2 style="font-size:13px;font-weight:700;color:#1f2937;padding:20px 20px 12px;margin:0">${esc(title)}</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:${headerBg};color:${headerColor}">
            <th style="text-align:left;padding:8px 20px;font-size:11px;font-weight:600">Área / Competência</th>
            <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:600;width:160px">Desempenho</th>
            <th style="text-align:left;padding:8px 20px;font-size:11px;font-weight:600;width:110px">Situação</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>`
}

export function buildRecoveryReportHtml(data: RecoveryReportData): string {
  const subtitle =
    data.kind === 'student'
      ? 'Relatório Individual do Aluno'
      : data.kind === 'form'
        ? 'Relatório do Formulário'
        : data.kind === 'dashboard'
          ? 'Relatório Geral — Dashboard Consolidado'
          : 'Análise por Habilidades, TRI e Bloom'

  const areaTitle =
    data.kind === 'student'
      ? 'Desempenho por Formulário'
      : data.kind === 'form'
        ? 'Desempenho por Habilidade BNCC'
        : data.kind === 'dashboard'
          ? 'Desempenho por Formulário'
          : 'Desempenho por Habilidade BNCC / SAEB'

  const metaFields = [
    data.reportDate && { label: 'Data do relatório', value: data.reportDate },
    data.studentName && { label: 'Aluno(a)', value: data.studentName },
    data.formTitle && { label: 'Formulário', value: data.formTitle },
    data.turma && { label: 'Turma / Série', value: data.turma },
    data.escola && { label: 'Escola', value: data.escola },
  ].filter(Boolean) as { label: string; value: string }[]

  const metaHtml = metaFields
    .map(
      (f) => `
      <div style="text-align:right">
        <p style="font-size:10px;color:#e9d5ff;text-transform:uppercase;letter-spacing:0.05em;margin:0">${esc(f.label)}</p>
        <p style="font-size:12px;font-weight:500;color:#ffffff;margin:4px 0 0">${esc(f.value)}</p>
      </div>`,
    )
    .join('')

  const summaryItems = [
    data.studentName && { dt: 'Nome', dd: data.studentName },
    data.studentEmail && { dt: 'E-mail', dd: data.studentEmail },
    data.formTitle && { dt: 'Formulário', dd: data.formTitle },
    data.turma && { dt: 'Turma', dd: data.turma },
    data.periodo && { dt: 'Período analisado', dd: data.periodo },
    data.averageTheta != null && { dt: 'TRI médio (θ)', dd: data.averageTheta.toFixed(2) },
    ...(data.summaryMetrics?.map((m) => ({ dt: m.label, dd: m.value })) ?? []),
  ].filter(Boolean) as { dt: string; dd: string }[]

  const summaryHtml = summaryItems
    .map(
      (item) => `
      <div style="margin-bottom:8px">
        <dt style="font-size:11px;color:#9ca3af;margin:0">${esc(item.dt)}</dt>
        <dd style="font-size:11px;font-weight:500;color:#1f2937;margin:2px 0 0;word-break:break-word">${esc(item.dd)}</dd>
      </div>`,
    )
    .join('')

  const highlightsHtml = data.highlights
    .map(
      (h, i) => `
      <li style="display:flex;gap:8px;font-size:11px;color:#4b5563;line-height:1.4;margin-bottom:8px">
        <span style="width:16px;height:16px;border-radius:50%;background:#f3e8ff;color:#7e22ce;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${i + 1}</span>
        ${esc(h)}
      </li>`,
    )
    .join('')

  const legendHtml = (Object.keys(PERFORMANCE_LEVEL_LABELS) as Array<keyof typeof PERFORMANCE_LEVEL_LABELS>)
    .map(
      (level) => `
      <li style="display:flex;align-items:center;gap:8px;font-size:10px;color:#4b5563;margin-bottom:6px">
        ${legendDot(level)} ${PERFORMANCE_LEVEL_LABELS[level]}
      </li>`,
    )
    .join('')

  const breakdownHtml = data.performanceBreakdown
    .filter((b) => b.count > 0)
    .map(
      (b) => `
      <li style="display:flex;align-items:center;justify-content:space-between;font-size:11px;margin-bottom:4px">
        <span style="display:flex;align-items:center;gap:8px;color:#4b5563">${legendDot(b.level)} ${esc(b.label)}</span>
        <span style="font-weight:600;color:#1f2937">${b.percentage}%</span>
      </li>`,
    )
    .join('')

  const triHtml =
    data.triSummary && data.triSummary.length > 0
      ? `
    <section style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;margin-bottom:24px">
      <h2 style="font-size:13px;font-weight:700;color:#1f2937;padding:20px 20px 12px;margin:0">Proficiência TRI (θ) por Formulário</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="background:#f5f3ff;color:#5b21b6">
            <th style="text-align:left;padding:8px 20px;font-weight:600">Formulário</th>
            <th style="text-align:left;padding:8px 12px;font-weight:600">θ médio</th>
            <th style="text-align:left;padding:8px 12px;font-weight:600">TCT médio</th>
            <th style="text-align:left;padding:8px 20px;font-weight:600">Respostas</th>
          </tr>
        </thead>
        <tbody>
          ${data.triSummary
            .map(
              (row, i) => `
            <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
              <td style="padding:10px 20px;font-weight:500;color:#1f2937">${esc(row.label)}</td>
              <td style="padding:10px 12px;font-weight:600;color:#7e22ce">${row.averageTheta != null ? row.averageTheta.toFixed(2) : '—'}</td>
              <td style="padding:10px 12px">${row.averageTct}%</td>
              <td style="padding:10px 20px">${row.totalResponses}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </section>`
      : ''

  const weakSkillsHtml =
    data.weakSkills.length > 0
      ? data.weakSkills
          .map(
            (s) =>
              `<li style="display:flex;gap:8px;font-size:11px;color:#374151;margin-bottom:6px"><span style="color:#f87171">•</span>${esc(s)}</li>`,
          )
          .join('')
      : '<p style="font-size:11px;color:#6b7280;margin:0">Nenhuma habilidade crítica identificada.</p>'

  const recsHtml = data.recommendations
    .map(
      (r) =>
        `<li style="display:flex;gap:8px;font-size:11px;color:#374151;margin-bottom:6px"><span style="color:#c084fc">•</span>${esc(r)}</li>`,
    )
    .join('')

  const trailsHtml =
    data.recommendedTrails && data.recommendedTrails.length > 0
      ? `
    <section style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;margin-bottom:24px">
      <h2 style="font-size:13px;font-weight:700;color:#1f2937;padding:20px 20px 4px;margin:0">Trilhas de recomposição recomendadas</h2>
      <p style="font-size:11px;color:#6b7280;padding:0 20px 12px;margin:0">Atribuídas automaticamente com base no percentual de acerto de cada avaliação.</p>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="background:#f0fdfa;color:#115e59">
            ${data.kind === 'form' ? '<th style="text-align:left;padding:8px 20px;font-weight:600">Aluno</th>' : ''}
            ${data.kind === 'student' ? '<th style="text-align:left;padding:8px 20px;font-weight:600">Formulário</th>' : ''}
            <th style="text-align:left;padding:8px 12px;font-weight:600">TCT</th>
            <th style="text-align:left;padding:8px 12px;font-weight:600">Faixa</th>
            <th style="text-align:left;padding:8px 20px;font-weight:600">Trilha recomendada</th>
          </tr>
        </thead>
        <tbody>
          ${data.recommendedTrails
            .map((row, i) => {
              const firstCol =
                data.kind === 'form'
                  ? `<td style="padding:10px 20px"><div style="font-weight:500;color:#1f2937">${esc(row.studentName || '—')}</div>${row.studentEmail ? `<div style="font-size:10px;color:#9ca3af">${esc(row.studentEmail)}</div>` : ''}</td>`
                  : data.kind === 'student'
                    ? `<td style="padding:10px 20px;font-weight:500;color:#1f2937">${esc(row.formTitle || '—')}</td>`
                    : ''
              const notes = [
                row.pedagogicalObjectives ? esc(row.pedagogicalObjectives) : '',
                row.teacherNotes ? esc(row.teacherNotes) : '',
              ]
                .filter(Boolean)
                .join('<br/>')
              const resources =
                row.pedagogicalPdfUrl || row.pedagogicalLinkUrl
                  ? `<div style="font-size:10px;color:#0f766e;margin-top:4px">${row.pedagogicalPdfUrl ? 'PDF pedagógico' : ''}${row.pedagogicalPdfUrl && row.pedagogicalLinkUrl ? ' · ' : ''}${row.pedagogicalLinkUrl ? 'Recursos online' : ''}</div>`
                  : ''
              return `
            <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
              ${firstCol}
              <td style="padding:10px 12px;font-weight:600">${row.studentPercent != null ? `${row.studentPercent}%` : '—'}</td>
              <td style="padding:10px 12px;color:#4b5563">${esc(row.percentRange || '—')}</td>
              <td style="padding:10px 20px">
                <div style="font-weight:500;color:#115e59">${esc(row.trailTitle)}</div>
                ${notes ? `<div style="font-size:10px;color:#6b7280;margin-top:4px">${notes}</div>` : ''}
                ${resources}
              </td>
            </tr>`
            })
            .join('')}
        </tbody>
      </table>
    </section>`
      : ''

  return `<div id="recovery-report-document" style="width:794px;min-height:1123px;background:#ffffff;color:#1f2937;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
    <div style="background:linear-gradient(to right,#7e22ce,#9333ea,#4f46e5);padding:24px 32px;color:#ffffff">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700">G</div>
          <div>
            <p style="font-size:14px;font-weight:600;margin:0;opacity:0.9">${APP_NAME}</p>
            <p style="font-size:10px;margin:4px 0 0;opacity:0.7">${APP_TAGLINE}</p>
          </div>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:flex-end">${metaHtml}</div>
      </div>
      <div style="margin-top:20px">
        <h1 style="font-size:24px;font-weight:700;margin:0;letter-spacing:-0.02em">RELATÓRIO</h1>
        <p style="font-size:14px;color:#f3e8ff;margin:4px 0 0">${esc(subtitle)}</p>
      </div>
    </div>

    <div style="display:flex">
      <aside style="width:220px;flex-shrink:0;border-right:1px solid #f3f4f6;background:#f9fafb;padding:20px">
        <section style="margin-bottom:20px">
          <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#7e22ce;margin:0 0 12px">Resumo</h2>
          <dl style="margin:0">${summaryHtml}</dl>
        </section>
        <section style="margin-bottom:20px">
          <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#7e22ce;margin:0 0 12px">Destaques</h2>
          <ul style="list-style:none;margin:0;padding:0">${highlightsHtml}</ul>
        </section>
        <section>
          <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#7e22ce;margin:0 0 12px">Legenda de Desempenho</h2>
          <ul style="list-style:none;margin:0;padding:0">${legendHtml}</ul>
        </section>
      </aside>

      <main style="flex:1;padding:24px">
        <section style="border:1px solid #f3f4f6;border-radius:12px;padding:20px;margin-bottom:24px">
          <h2 style="font-size:13px;font-weight:700;color:#1f2937;margin:0 0 16px">Visão Geral do Desempenho</h2>
          <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
            ${donutSvg(data.overallPercentage, data.performanceBreakdown)}
            <div style="flex:1;min-width:180px">
              <p style="font-size:11px;color:#6b7280;line-height:1.5;margin:0 0 12px">
                O percentual representa o desempenho médio nas avaliações analisadas, considerando acertos por habilidade e nível de proficiência.
              </p>
              <ul style="list-style:none;margin:0;padding:0">${breakdownHtml}</ul>
            </div>
          </div>
        </section>

        ${areaTable(areaTitle, data.areaRows, '#faf5ff', '#6b21a8')}
        ${data.criticalSkillRows && data.criticalSkillRows.length > 0 ? areaTable('Habilidades com maior déficit (BNCC / SAEB)', data.criticalSkillRows, '#fffbeb', '#92400e') : ''}
        ${data.bloomRows && data.bloomRows.length > 0 ? areaTable('Desempenho por Nível Bloom', data.bloomRows, '#eef2ff', '#3730a3') : ''}
        ${triHtml}
        ${trailsHtml}

        <section style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="border:1px solid #fee2e2;background:#fef2f2;border-radius:12px;padding:16px">
            <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#b91c1c;margin:0 0 12px">Habilidades que precisam de mais apoio</h3>
            <ul style="list-style:none;margin:0;padding:0">${weakSkillsHtml}</ul>
          </div>
          <div style="border:1px solid #f3e8ff;background:#faf5ff;border-radius:12px;padding:16px">
            <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#7e22ce;margin:0 0 12px">Próximos passos / Recomendações</h3>
            <ul style="list-style:none;margin:0;padding:0">${recsHtml}</ul>
          </div>
        </section>
      </main>
    </div>

    <div style="border-top:1px solid #f3f4f6;padding:16px 32px;background:#f9fafb">
      <p style="font-size:11px;color:#6b7280;text-align:center;margin:0 0 12px">
        Com foco e continuidade, o aluno pode avançar ainda mais nas habilidades trabalhadas.
        Este relatório foi gerado automaticamente pela plataforma ${APP_NAME}.
      </p>
      <div style="height:4px;border-radius:9999px;background:linear-gradient(to right,#9333ea,#6366f1)"></div>
      <p style="font-size:10px;text-align:center;color:#9ca3af;margin:8px 0 0">${APP_NAME} · ${APP_TAGLINE}</p>
    </div>
  </div>`
}
