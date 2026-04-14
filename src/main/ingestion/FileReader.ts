import { readFileSync } from 'fs'
import { extname } from 'path'

const MAX_CHARS = 150_000

export interface FileContent {
  text: string
  truncated: boolean
  extension: string
}

/**
 * Reads a file and returns its text content.
 * Supports .md, .txt, and .pdf. Truncates at 150k characters.
 */
export async function readFile(filePath: string): Promise<FileContent> {
  const ext = extname(filePath).toLowerCase()

  let text: string

  if (ext === '.pdf') {
    text = await readPdf(filePath)
  } else if (ext === '.md' || ext === '.txt') {
    text = readFileSync(filePath, 'utf-8')
  } else {
    throw new Error(`Tipo de arquivo não suportado: ${ext}. Use .md, .txt ou .pdf`)
  }

  const truncated = text.length > MAX_CHARS
  return {
    text: truncated ? text.slice(0, MAX_CHARS) + '\n\n[CONTEÚDO TRUNCADO — limite de 150.000 caracteres atingido]' : text,
    truncated,
    extension: ext,
  }
}

async function readPdf(filePath: string): Promise<string> {
  // Dynamically require pdf-parse to avoid issues with electron-vite bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const buffer = readFileSync(filePath)
  const data = await pdfParse(buffer)
  return data.text as string
}
