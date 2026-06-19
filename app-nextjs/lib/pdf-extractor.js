// Server-only — only import this file from API routes (never from client components)

const MAX_EXTRACT_CHARS = 40_000

/**
 * Extracts plain text from a file buffer.
 * Supports: PDF, DOCX, XLSX/XLS, plain text.
 * PPTX and images are not handled (returns null → caller falls back to Gemini inlineData).
 *
 * @param {Buffer} buffer  - Raw file bytes
 * @param {string} mimeType
 * @param {string} fileName
 * @returns {Promise<{text:string|null, charCount:number, method:string, pages?:number}|null>}
 */
export async function extractText(buffer, mimeType, fileName) {
  const mime = (mimeType || '').toLowerCase()
  const name = (fileName  || '').toLowerCase()

  // ── PDF ────────────────────────────────────────────────────────────────────
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    try {
      const { default: pdfParse } = await import('pdf-parse')
      const data = await pdfParse(buffer)
      const text = (data.text || '').replace(/\r\n/g, '\n').trim()
      if (text.length < 20) {
        return { text: null, charCount: 0, method: 'pdf-parse', reason: 'image-based PDF or empty' }
      }
      return { text, charCount: text.length, method: 'pdf-parse', pages: data.numpages }
    } catch (err) {
      console.error('[pdf-extractor] PDF error:', err.message, `(${name})`)
      return { text: null, charCount: 0, method: 'pdf-parse', reason: err.message }
    }
  }

  // ── DOCX ──────────────────────────────────────────────────────────────────
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      const text = (result.value || '').replace(/\r\n/g, '\n').trim()
      return { text: text || null, charCount: text.length, method: 'mammoth' }
    } catch (err) {
      console.error('[pdf-extractor] DOCX error:', err.message, `(${name})`)
      return null
    }
  }

  // ── XLSX / XLS ────────────────────────────────────────────────────────────
  if (
    mime.includes('spreadsheetml') ||
    mime.includes('ms-excel') ||
    mime.includes('vnd.ms-excel') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls')
  ) {
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const parts = []
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const csv  = rows.map(r => r.join('\t')).join('\n')
        if (csv.trim()) parts.push(`[Hoja: ${sheetName}]\n${csv}`)
      }
      const text = parts.join('\n\n').trim()
      return { text: text || null, charCount: text.length, method: 'xlsx' }
    } catch (err) {
      console.error('[pdf-extractor] XLSX error:', err.message, `(${name})`)
      return null
    }
  }

  // ── Plain text ────────────────────────────────────────────────────────────
  if (
    mime.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.rtf')
  ) {
    const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').trim()
    return { text: text || null, charCount: text.length, method: 'text' }
  }

  // PPTX, images, etc. → caller should use Gemini inlineData
  return null
}

/** Keywords that suggest a file contains student grade data */
const GRADE_KEYWORDS = [
  'calificacion', 'calificación', 'pauta', ' rut', '\trut',
  'puntaje', 'promedio', 'acta', 'nota final', 'resultado',
  'corrección', 'correccion', 'rendimiento',
  'aprobado', 'reprobado', 'nota alumno', 'percentil',
  'evaluacion', 'evaluación', 'ponderacion', 'ponderación',
  'solemne', 'control ', 'certamen',
]

/**
 * Returns true if extracted text looks like a grade/result document.
 * @param {string} text
 */
export function detectGradeContent(text) {
  if (!text) return false
  const t = text.toLowerCase()
  return GRADE_KEYWORDS.some(kw => t.includes(kw))
}

/**
 * Returns true if the user's RUT appears anywhere in the text.
 * Normalizes both text and RUT by removing dots, dashes, spaces.
 *
 * @param {string} text
 * @param {string} rut  - e.g. "12.345.678-9" or "12345678-9"
 */
export function findRutInText(text, rut) {
  if (!rut || !text) return false
  const normalize = s => s.replace(/[\s.\-]/g, '').toUpperCase()
  const rutNorm   = normalize(rut)
  if (rutNorm.length < 7) return false  // too short to be meaningful
  const textNorm  = normalize(text)
  return textNorm.includes(rutNorm)
}

/**
 * Truncates extracted text to MAX_EXTRACT_CHARS, preserving the beginning
 * (most likely to have course/evaluation info) and adding a truncation note.
 *
 * @param {string} text
 * @returns {{finalText:string, truncated:boolean}}
 */
export function truncateExtracted(text) {
  if (!text || text.length <= MAX_EXTRACT_CHARS) return { finalText: text, truncated: false }
  return {
    finalText: text.slice(0, MAX_EXTRACT_CHARS) + '\n[...texto truncado por longitud...]',
    truncated: true,
  }
}
