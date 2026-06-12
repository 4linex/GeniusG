export interface PdfTableRow {
  columns: string[]
}

export async function exportReportPdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: PdfTableRow[],
  filename: string,
) {
  const { jsPDF: JsPDF } = await import('jspdf')
  const doc = new JsPDF({ orientation: rows.length > 8 ? 'landscape' : 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(subtitle, 14, y)
  doc.text(`Gerado em: ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 14, y + 5)
  y += 16

  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)

  const colCount = headers.length
  const colWidth = (pageWidth - 28) / colCount

  headers.forEach((h, i) => {
    doc.text(h, 14 + i * colWidth, y, { maxWidth: colWidth - 2 })
  })
  y += 7

  doc.setDrawColor(200)
  doc.line(14, y - 2, pageWidth - 14, y - 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  for (const row of rows) {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = 20
    }
    row.columns.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * colWidth, y, { maxWidth: colWidth - 2 })
    })
    y += 7
  }

  doc.save(filename)
}
