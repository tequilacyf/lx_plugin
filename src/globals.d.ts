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
declare const crypto: {
  md5(data: string): string
  aesEncrypt(data: string, key: string, iv?: string): string
  aesDecrypt(data: string, key: string, iv?: string): string
  rsaEncrypt(data: string, key: string): string
  randomBytes(size: number): Uint8Array
}

// Host-injected functions for jsenv sub-VMs
declare function __go_send(name: string, data: string): void
declare function __go_raw_inflate(hex: string): string
