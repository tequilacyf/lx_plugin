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
