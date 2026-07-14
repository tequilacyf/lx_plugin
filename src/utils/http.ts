import type { HTTPResponse } from '@songloft/plugin-sdk'

/**
 * Call a host API endpoint with authentication.
 */
export async function callHostAPI(path: string, options: RequestInit = {}): Promise<any> {
  const hostUrl = await songloft.plugin.getHostUrl()
  const token = await songloft.plugin.getToken()

  const url = `${hostUrl}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  }

  const resp = await fetch(url, { ...options, headers })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Host API error ${resp.status}: ${text}`)
  }
  return resp.json()
}

/**
 * Wrap a handler with standard error handling and JSON response.
 */
export function jsonResponse(body: any, status = 200): HTTPResponse {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
