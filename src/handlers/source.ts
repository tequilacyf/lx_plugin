import type { HTTPRequest, HTTPResponse } from '@songloft/plugin-sdk'
import { parseQuery } from '@songloft/plugin-sdk'
import { errorResponse, successResponse, decodeBody } from './response'
import type { SourceManager } from '../source/manager'

export function createSourceHandlers(sourceManager: SourceManager) {
  async function handleGetSources(_req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const sources = await sourceManager.getAllSources()
      const batchStatus = sourceManager.getBatchStatus()
      return successResponse({ sources, batch: batchStatus })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleImportSource(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const body = decodeBody(req)
      if (!body) return errorResponse('Empty request body')
      const { script, filename } = JSON.parse(body)

      if (!script) return errorResponse('script is required')

      const result = await sourceManager.importScript(script, filename)
      if (!result.success) {
        return errorResponse(result.error || 'Import failed')
      }

      return successResponse({ id: result.id, name: result.name })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleImportUrl(req: HTTPRequest): Promise<HTTPResponse> {
    let url = ''
    try {
      // Prefer query param to avoid host hex-decoding POST body
      const q = parseQuery(req.query)
      url = q.url
      if (!url) {
        const body = decodeBody(req)
        if (body) {
          try { url = JSON.parse(body).url } catch {}
        }
      }
      if (!url) return errorResponse('url is required (query param or JSON body)')

      songloft.log.info(`[import-url] Fetching source from: ${url}`)

      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      if (!resp.ok) return errorResponse(`Failed to fetch source script: HTTP ${resp.status} ${resp.statusText}`)

      const script = await resp.text()
      if (!script || script.trim().length === 0) {
        return errorResponse('Fetched script is empty')
      }

      songloft.log.info(`[import-url] Fetched ${script.length} bytes from ${url}`)

      const result = await sourceManager.importScript(script, url.split('/').pop())
      if (!result.success) {
        return errorResponse(result.error || 'Import failed')
      }

      return successResponse({ id: result.id, name: result.name })
    } catch (err: any) {
      songloft.log.error(`[import-url] Error importing from ${url}: ${err.message || err}`)
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleDeleteSource(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const q = parseQuery(req.query)
      const id = q.id
      if (!id) return errorResponse('id is required')

      await sourceManager.deleteSource(id)
      return successResponse(null)
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  async function handleToggleSource(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const q = parseQuery(req.query)
      const id = q.id
      const enabled = q.enabled === 'true' ? true : q.enabled === 'false' ? false : undefined

      if (!id) return errorResponse('id is required')

      let newEnabled: boolean
      if (enabled === true) {
        const ok = await sourceManager.enableSource(id)
        if (!ok) return errorResponse('Enable failed')
        newEnabled = true
      } else if (enabled === false) {
        const ok = await sourceManager.disableSource(id)
        if (!ok) return errorResponse('Disable failed')
        newEnabled = false
      } else {
        newEnabled = await sourceManager.toggleSource(id)
      }

      return successResponse({ enabled: newEnabled })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  // Handle multipart ZIP uploads
  async function handleImportZip(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const contentType = req.headers?.['content-type'] || ''
      if (!contentType.includes('multipart/form-data')) {
        return errorResponse('Content-Type must be multipart/form-data')
      }

      // Extract boundary
      const boundaryMatch = contentType.match(/boundary=(.+)/)
      if (!boundaryMatch) return errorResponse('Missing boundary in Content-Type')

      const boundary = boundaryMatch[1]
      const bodyBytes = req.body || new Uint8Array(0)

      // Parse multipart to extract .js files
      const files = parseMultipart(bodyBytes, boundary)
      if (files.length === 0) {
        return errorResponse('No .js files found in ZIP')
      }

      const scripts = files
        .filter(f => f.filename.endsWith('.js'))
        .map(f => ({ script: f.content, filename: f.filename }))

      if (scripts.length === 0) {
        return errorResponse('No .js files found in ZIP')
      }

      // Batch import (background)
      sourceManager.batchImport(scripts)

      return successResponse({
        imported: scripts.length,
        message: 'Batch import started. Poll GET /api/sources for progress.',
      })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  }

  return {
    handleGetSources,
    handleImportSource,
    handleImportUrl,
    handleDeleteSource,
    handleToggleSource,
    handleImportZip,
  }
}

// --- Multipart / ZIP parsing helpers ---

interface MultipartFile {
  filename: string
  contentType: string
  content: string
}

function parseMultipart(body: Uint8Array, boundary: string): MultipartFile[] {
  const files: MultipartFile[] = []
  const boundaryBytes = latin1Encode('--' + boundary)
  const endBytes = latin1Encode('--' + boundary + '--')

  let pos = 0
  while (pos < body.length) {
    // Find next boundary
    const boundaryStart = findBytes(body, boundaryBytes, pos)
    if (boundaryStart === -1) break

    // Skip boundary line
    const afterBoundary = boundaryStart + boundaryBytes.length
    // Skip \r\n after boundary
    let headerStart = afterBoundary
    if (headerStart < body.length && body[headerStart] === 0x0d && headerStart + 1 < body.length && body[headerStart + 1] === 0x0a) {
      headerStart += 2
    }

    // Find end of headers (double \r\n)
    const headerEnd = findBytes(body, latin1Encode('\r\n\r\n'), headerStart)
    if (headerEnd === -1) break

    // Parse headers
    const headerBytes = body.slice(headerStart, headerEnd)
    const headerStr = latin1Decode(headerBytes)

    let filename = ''
    let contentType = 'application/octet-stream'

    const contentDispositionMatch = headerStr.match(/Content-Disposition:.*?filename="([^"]+)"/i)
    if (contentDispositionMatch) {
      filename = contentDispositionMatch[1]
    }

    const contentTypeMatch = headerStr.match(/Content-Type:\s*(.+)/i)
    if (contentTypeMatch) {
      contentType = contentTypeMatch[1].trim()
    }

    // Content starts after \r\n\r\n
    const contentStart = headerEnd + 4

    // Find next boundary (start of next --boundary)
    const nextBoundary = findBytes(body, boundaryBytes, contentStart)
    if (nextBoundary === -1) break

    // Content ends at \r\n before next boundary
    let contentEnd = nextBoundary
    if (contentEnd >= 2 && body[contentEnd - 2] === 0x0d && body[contentEnd - 1] === 0x0a) {
      contentEnd -= 2
    }

    if (filename) {
      // Read content as latin1 string (binary-safe)
      const contentBytes = body.slice(contentStart, contentEnd)

      // If it's a ZIP file, try to parse .js files from it
      if (filename.endsWith('.zip')) {
        const jsFiles = parseZipFile(contentBytes)
        files.push(...jsFiles)
      } else if (filename.endsWith('.js')) {
        files.push({
          filename,
          contentType,
          content: latin1Decode(contentBytes),
        })
      }
    }

    pos = nextBoundary
  }

  return files
}

function parseZipFile(data: Uint8Array): MultipartFile[] {
  const files: MultipartFile[] = []

  // Find EOCD signature (PK\x05\x06)
  const eocdSig = latin1Encode('PK\x05\x06')
  const eocdPos = findBytesReverse(data, eocdSig, data.length - 22)
  if (eocdPos === -1) return files

  // Read central directory info from EOCD
  const centralDirOffset = readUint32LE(data, eocdPos + 16)
  const centralDirSize = readUint32LE(data, eocdPos + 12)

  // Parse central directory entries
  let pos = centralDirOffset
  const endPos = centralDirOffset + centralDirSize

  while (pos < endPos && pos + 46 <= data.length) {
    // Check central directory signature (PK\x01\x02)
    if (data[pos] !== 0x50 || data[pos + 1] !== 0x4b ||
        data[pos + 2] !== 0x01 || data[pos + 3] !== 0x02) {
      break
    }

    const compressionMethod = readUint16LE(data, pos + 10)
    const compressedSize = readUint32LE(data, pos + 20)
    const uncompressedSize = readUint32LE(data, pos + 24)
    const fileNameLength = readUint16LE(data, pos + 28)
    const extraFieldLength = readUint16LE(data, pos + 30)
    const fileCommentLength = readUint16LE(data, pos + 32)
    const localHeaderOffset = readUint32LE(data, pos + 42)

    // Read filename
    const fileNameBytes = data.slice(pos + 46, pos + 46 + fileNameLength)
    const fileName = latin1Decode(fileNameBytes)

    // Skip to next entry
    pos = pos + 46 + fileNameLength + extraFieldLength + fileCommentLength

    // Skip directories, __MACOSX, .DS_Store, ._ files
    if (fileName.endsWith('/')) continue
    if (fileName.startsWith('__MACOSX/')) continue
    if (fileName.endsWith('.DS_Store')) continue
    if (fileName.includes('/._')) continue

    // Only process .js files
    if (!fileName.endsWith('.js')) continue

    // Read from local file header to get actual content
    const fileContent = readZipLocalEntry(data, localHeaderOffset)
    if (fileContent !== null) {
      files.push({
        filename: fileName.split('/').pop() || fileName,
        contentType: 'application/javascript',
        content: fileContent,
      })
    }
  }

  return files
}

function readZipLocalEntry(data: Uint8Array, offset: number): string | null {
  // Local file header signature (PK\x03\x04)
  if (offset + 30 > data.length) return null
  if (data[offset] !== 0x50 || data[offset + 1] !== 0x4b ||
      data[offset + 2] !== 0x03 || data[offset + 3] !== 0x04) {
    // Try reading from offset anyway (fallback)
  }

  const compressionMethod = readUint16LE(data, offset + 8)
  const compressedSize = readUint32LE(data, offset + 18)
  const uncompressedSize = readUint32LE(data, offset + 22)
  const fileNameLength = readUint16LE(data, offset + 26)
  const extraFieldLength = readUint16LE(data, offset + 28)

  const dataStart = offset + 30 + fileNameLength + extraFieldLength
  if (dataStart + compressedSize > data.length) return null

  const compressedData = data.slice(dataStart, dataStart + compressedSize)

  if (compressionMethod === 0) {
    // STORED
    return latin1Decode(compressedData)
  } else if (compressionMethod === 8) {
    // DEFLATE - use host __go_raw_inflate
    const hex = bytesToHex(compressedData)
    try {
      const result = __go_raw_inflate(hex)
      return result
    } catch {
      return null
    }
  }

  return null
}

// --- Byte utilities ---

function latin1Encode(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff
  }
  return bytes
}

function latin1Decode(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i])
  }
  return str
}

function findBytes(haystack: Uint8Array, needle: Uint8Array, start = 0): number {
  for (let i = start; i <= haystack.length - needle.length; i++) {
    let found = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false
        break
      }
    }
    if (found) return i
  }
  return -1
}

function findBytesReverse(haystack: Uint8Array, needle: Uint8Array, start: number): number {
  for (let i = Math.min(start, haystack.length - needle.length); i >= 0; i--) {
    let found = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false
        break
      }
    }
    if (found) return i
  }
  return -1
}

function readUint16LE(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8)
}

function readUint32LE(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}
