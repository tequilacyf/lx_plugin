import { toMD5, aes128EcbEncrypt, aes128EcbDecrypt } from '../crypto-shim'

export const formatSinger = (rawData: string): string => {
  if (!rawData) return ''
  return rawData.replace(/&/g, '、')
}

export const formatPic = (url: string, size?: number): string => {
  if (!url) return ''
  if (size) {
    url = url.replace(/\d+\.jpg/, `${size}.jpg`)
  }
  return url
}

export const matchToken = (headers: Record<string, string>): string | null => {
  const setCookie = headers['set-cookie']
  if (!setCookie) return null
  const match = setCookie.match(/kw_token=([^;]+)/)
  return match ? match[1] : null
}

export const decodeLyricInternal = async (buf: Uint8Array, isGetLyricx: boolean): Promise<string> => {
  const prefix = String.fromCharCode(...buf.slice(0, 13))
  let data: Uint8Array

  if (prefix === 'tp=content') {
    const separatorIndex = findCrlfCrlf(buf)
    if (separatorIndex < 0) {
      data = buf
    } else {
      data = buf.slice(separatorIndex + 4)
    }
    data = zlib.inflate(data)
  } else {
    data = buf
  }

  let result = uint8ArrayToString(data)

  if (isGetLyricx) {
    result = xorDecode(result, 'yeelion')
  }

  return result
}

const findCrlfCrlf = (buf: Uint8Array): number => {
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a && buf[i + 2] === 0x0d && buf[i + 3] === 0x0a) {
      return i
    }
  }
  return -1
}

const xorDecode = (str: string, key: string): string => {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

const uint8ArrayToString = (buf: Uint8Array): string => {
  let result = ''
  for (let i = 0; i < buf.length; i++) {
    result += String.fromCharCode(buf[i])
  }
  return result
}

export const decodeLyric = async (params: {
  lrcBase64: string
  isGetLyricx: boolean
}): Promise<string> => {
  const buf = Buffer.from(params.lrcBase64, 'base64')
  const raw = await decodeLyricInternal(new Uint8Array(buf), params.isGetLyricx)
  return Buffer.from(uint8ArrayToString(Uint8Array.from(raw, c => c.charCodeAt(0)))).toString('base64')
}

const LYRIC_KEY = new Uint8Array([112, 87, 39, 61, 199, 250, 41, 191, 57, 68, 45, 114, 221, 94, 140, 228])
const APP_ID = 'y67sprxhhpws'

export const wbdCrypto = {
  buildParam(jsonData: Record<string, any>): string {
    const jsonStr = JSON.stringify(jsonData)
    const encrypted = aes128EcbEncrypt(jsonStr, LYRIC_KEY)
    const encryptedBase64 = Buffer.from(encrypted).toString('base64')
    const secret = toMD5(encryptedBase64 + APP_ID)
    return `access_key=${APP_ID}&data=${encodeURIComponent(encryptedBase64)}&sign=${encodeURIComponent(secret)}`
  },

  decodeData(base64Result: string): any {
    const encrypted = Buffer.from(base64Result, 'base64')
    const decrypted = aes128EcbDecrypt(new Uint8Array(encrypted), LYRIC_KEY)
    const str = uint8ArrayToString(decrypted)
    try {
      return JSON.parse(str)
    } catch (_) {
      return str
    }
  },
}
