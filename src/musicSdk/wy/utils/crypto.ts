const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomBase62(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += base62[Math.floor(Math.random() * base62.length)]
  }
  return result
}

function toHexStr(buf: any): string {
  if (typeof buf === 'string') return buf
  if (buf._hex) return buf._hex
  return buf.toString('hex')
}

const presetKey = '0CoJUm6Qyw8W8jud'
const iv = '0102030405060708'
const publicKey = '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----'

export const weapi = (object: any): { params: string; encSecKey: string } => {
  const text = JSON.stringify(object)
  const randomKeyStr = randomBase62(16)

  const params1 = crypto.aesEncrypt(text, 'cbc', presetKey, iv)
  const params2 = crypto.aesEncrypt(params1, 'cbc', randomKeyStr, iv)
  const paramsBase64 = params2.toString('base64')

  const randomKeyReversed = randomKeyStr.split('').reverse().join('')
  const encSecKeyRaw = crypto.rsaEncrypt(randomKeyReversed, publicKey)
  const encSecKey = toHexStr(encSecKeyRaw)

  return { params: paramsBase64, encSecKey }
}

export const linuxapi = (object: any): string => {
  const text = JSON.stringify(object)
  const key = 'rFgB&h#%2?^eDg:Q'
  const encrypted = crypto.aesEncrypt(text, 'ecb', key)
  return encrypted.toString('base64')
}

export const eapi = (url: string, object: any): string => {
  const key = 'e82ckenh8dichen8'
  const text = JSON.stringify(object)
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = crypto.md5(message)
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  const encrypted = crypto.aesEncrypt(data, 'ecb', key)
  return toHexStr(encrypted).toUpperCase()
}
