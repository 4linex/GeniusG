import { buildRecoveryReportHtml } from '@/lib/recoveryReportHtml'
import type { RecoveryReportData } from '@/lib/recoveryReport'

function createExportIframe(width: number) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('tabindex', '-1')
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    height: '1px',
    border: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
  })
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Não foi possível preparar a exportação do PDF.')
  }

  return iframe
}

export async function exportRecoveryReportFromData(data: RecoveryReportData, filename: string) {
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const width = 794
  const iframe = createExportIframe(width)
  const iframeDoc = iframe.contentDocument

  if (!iframeDoc) {
    iframe.remove()
    throw new Error('Não foi possível preparar a exportação do PDF.')
  }

  try {
    const reportHtml = buildRecoveryReportHtml(data)

    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #ffffff; }
    </style>
  </head>
  <body>${reportHtml}</body>
</html>`)
    iframeDoc.close()

    const root = iframeDoc.getElementById('recovery-report-document')
    if (!root) {
      throw new Error('Não foi possível montar o relatório para exportação.')
    }

    const fullHeight = Math.max(root.scrollHeight, root.offsetHeight, 1123)
    iframe.style.height = `${fullHeight}px`

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    const canvas = await html2canvas(root, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      width,
      height: fullHeight,
      windowWidth: width,
      windowHeight: fullHeight,
      scrollX: 0,
      scrollY: 0,
    })

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('A captura do relatório ficou vazia. Tente novamente.')
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
  } finally {
    iframe.remove()
  }
}
