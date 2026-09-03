import { jsPDF } from 'jspdf'
import type { ScanResult, CheckStatus } from './api'

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: 'Looks good',
  warn: 'Worth a look',
  fail: 'Needs attention',
  inconclusive: 'Inconclusive',
  skip: 'Skipped',
  coming_soon: 'Coming soon',
}

export function downloadScanReportPdf(result: ScanResult) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - marginX * 2
  let y = 56

  function ensureSpace(lineHeight: number) {
    if (y + lineHeight > pageHeight - 48) {
      doc.addPage()
      y = 56
    }
  }

  function writeLines(text: string, size: number, style: 'normal' | 'bold', color: [number, number, number], lineGap = 14) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      ensureSpace(lineGap)
      doc.text(line, marginX, y)
      y += lineGap
    }
  }

  writeLines('SecureMail Sentinel — Security Report', 18, 'bold', [20, 30, 60], 24)
  writeLines(`Target: ${result.target}`, 11, 'normal', [60, 65, 80], 16)
  writeLines(`Scan type: ${result.tier === 'premium' ? 'Full 4-layer deep scan' : 'Free basic check (Layer 1 only)'}`, 11, 'normal', [60, 65, 80], 16)
  writeLines(`Generated: ${new Date().toLocaleString()}`, 11, 'normal', [60, 65, 80], 20)

  for (const layer of result.layers) {
    ensureSpace(28)
    y += 8
    writeLines(`Layer ${layer.layer}: ${layer.name}`, 13.5, 'bold', [20, 30, 60], 18)
    writeLines(layer.summary, 10.5, 'normal', [100, 105, 120], 16)
    y += 4

    for (const finding of layer.findings) {
      ensureSpace(16)
      writeLines(`${finding.check} — ${STATUS_LABEL[finding.status]}`, 11, 'bold', [30, 35, 50], 15)
      writeLines(finding.explanation, 10.5, 'normal', [70, 75, 90], 14)
      y += 6
    }
  }

  if (result.tier === 'free' && result.upsell) {
    y += 8
    writeLines(result.upsell, 10, 'normal', [100, 105, 120], 14)
  }

  const safeTarget = result.target.replace(/[^a-z0-9.@-]/gi, '_')
  doc.save(`securemail-sentinel-${safeTarget}.pdf`)
}
