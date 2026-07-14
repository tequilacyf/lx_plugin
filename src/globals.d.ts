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
