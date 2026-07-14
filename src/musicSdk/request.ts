const defaultHeaders: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

export interface HttpFetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  form?: Record<string, any>
  formData?: Record<string, any>
  timeout?: number
  format?: string
}

export interface HttpFetchResult {
  statusCode: number
  headers: Record<string, string>
  body: any
  raw?: string
}

interface RequestObj {
  promise: Promise<HttpFetchResult>
  cancelHttp: () => void
  isCancelled: boolean
}

const urlEncode = (obj: Record<string, any>): string => {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v === null || v === undefined ? '' : String(v))}`)
    .join('&')
}

export const httpFetch = (url: string, options: HttpFetchOptions = { method: 'get' }): RequestObj => {
  let isCancelled = false
  let timedOut = false

  const doFetch = async (): Promise<HttpFetchResult> => {
    const method = (options.method || 'get').toUpperCase()
    const headers: Record<string, string> = { ...defaultHeaders, ...options.headers }

    let fetchBody: string | undefined
    if (options.body) {
      if (typeof options.body === 'object' && !(options.body instanceof Uint8Array) && !(options.body instanceof ArrayBuffer)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
        fetchBody = JSON.stringify(options.body)
      } else {
        fetchBody = String(options.body)
      }
    } else if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      fetchBody = urlEncode(options.form)
    } else if (options.formData) {
      try {
        const fd = new FormData()
        for (const [k, v] of Object.entries(options.formData)) {
          fd.append(k, String(v))
        }
        fetchBody = fd as any
      } catch (_e) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        fetchBody = urlEncode(options.formData)
      }
    }

    const timeout = options.timeout || 15000
    const timeoutId = setTimeout(() => { timedOut = true }, timeout)

    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: fetchBody,
      })

      clearTimeout(timeoutId)
      if (timedOut) throw new Error('Request timeout')

      const rawText = await resp.text()
      let body: any = rawText
      try {
        body = JSON.parse(rawText)
      } catch (_) {
        // keep as text
      }

      const respHeaders: Record<string, string> = {}
      resp.headers.forEach((v, k) => { respHeaders[k] = v })

      return { statusCode: resp.status, headers: respHeaders, body, raw: rawText }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (isCancelled) throw new Error('Request cancelled')
      if (timedOut) throw new Error('timeout')
      throw err
    }
  }

  const requestObj: RequestObj = {
    isCancelled: false,
    cancelHttp: () => {
      isCancelled = true
      requestObj.isCancelled = true
    },
    promise: null as any,
  }

  requestObj.promise = doFetch().catch(err => {
    if (err.message === 'Request cancelled') throw err
    if (err.message === 'Request timeout') throw new Error('timeout')
    throw err
  })

  return requestObj
}

export const cancelHttp = (requestObj: RequestObj | null): void => {
  if (!requestObj) return
  requestObj.cancelHttp()
}
