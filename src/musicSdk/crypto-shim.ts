// Crypto adapter: wraps host crypto polyfill for musicSdk usage
// The host crypto uses SongloftCryptoInput types; we cast through any for compatibility

export const toMD5 = (str: string): string => {
  return crypto.md5(str)
}

// AES-128-ECB encrypt via host polyfill
export function aes128EcbEncrypt(data: any, key: any): any {
  return crypto.aesEncrypt(data, 'ecb', key)
}

// AES-128-ECB decrypt via host polyfill
export function aes128EcbDecrypt(data: any, key: any): any {
  return crypto.aesDecrypt(data, 'ecb', key)
}

// AES-128-CBC encrypt via host polyfill
export function aes128CbcEncrypt(data: any, key: any, iv: any): any {
  return crypto.aesEncrypt(data, 'cbc', key, iv)
}

// AES-128-CBC decrypt via host polyfill
export function aes128CbcDecrypt(data: any, key: any, iv: any): any {
  return crypto.aesDecrypt(data, 'cbc', key, iv)
}

// RSA encrypt via host polyfill
export function rsaEncryptNoPadding(data: any, publicKeyPem: string): any {
  return crypto.rsaEncrypt(data, publicKeyPem)
}

// XOR decrypt for KW lyrics
export function xorDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const output = new Uint8Array(data.length)
  const keyLen = key.length
  for (let i = 0; i < data.length; i++) {
    output[i] = data[i] ^ key[i % keyLen]
  }
  return output
}
