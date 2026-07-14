// globals.d.ts - additional declarations not covered by @songloft/plugin-sdk

// Buffer is available as a host polyfill in the QuickJS sandbox
declare const Buffer: {
  from(data: string, encoding?: string): any
  from(data: ArrayBuffer | ArrayBufferView): any
  from(array: number[]): any
  alloc(size: number, fill?: number | string, encoding?: string): any
  concat(buffers: any[], totalLength?: number): any
  isBuffer(obj: unknown): boolean
  byteLength(str: string, encoding?: string): number
  new(size: number): any
}

// zlib is available as a host polyfill
declare const zlib: {
  inflate(data: Uint8Array | any): any
  deflate(data: Uint8Array | any): any
  inflateRaw(data: Uint8Array | any): any
  deflateRaw(data: Uint8Array | any): any
}

// crypto is available as a host polyfill
// Host API: aesEncrypt/Decrypt take (data, mode, key, iv?) where mode is 'ecb' or 'cbc'
// Return type is Buffer-like (has .toString(encoding) / ._hex / Uint8Array interface)
declare const crypto: {
  md5(data: string): string
  aesEncrypt(data: string | Uint8Array, mode: string, key: string | Uint8Array, iv?: string | Uint8Array): any
  aesDecrypt(data: string | Uint8Array, mode: string, key: string | Uint8Array, iv?: string | Uint8Array): any
  rsaEncrypt(data: string, key: string): any
  randomBytes(size: number): Uint8Array
}

// Host-injected functions for jsenv sub-VMs
declare function __go_send(name: string, data: string): void
declare function __go_raw_inflate(hex: string): string
