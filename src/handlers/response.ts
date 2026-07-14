import type { HTTPResponse } from '@songloft/plugin-sdk'

export function successResponse(data: any, msg = 'success'): HTTPResponse {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 0, msg, data }),
  }
}

export function warningResponse(data: any, warning: string): HTTPResponse {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 0, msg: 'success', data, warning }),
  }
}

export function errorResponse(msg: string, status = 400): HTTPResponse {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: status, msg, data: null }),
  }
}

export function notFoundResponse(msg = 'Not found'): HTTPResponse {
  return errorResponse(msg, 404)
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export function decodeBody(req: HTTPRequest): string {
  if (!req.body || req.body.length === 0) return ''
  const raw = new TextDecoder().decode(req.body)
  if (!raw) return ''
  // Songloft host may hex-encode POST bodies; try hex decode first, fall back to raw
  if (/^[0-9a-fA-F]+$/.test(raw)) {
    try {
      const bytes = hexToBytes(raw)
      return new TextDecoder().decode(bytes)
    } catch {}
  }
  return raw
}
