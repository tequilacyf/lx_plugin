// Polyfill globalThis.window for lx-music platform code that references window
;(globalThis as any).window = globalThis

export { default } from './facade'
export { sources, platforms, getSource, initAll } from './facade'
export { sizeFormate, decodeName, formatPlayTime, dateFormat, formatPlayCount, formatSingerName } from './utils'
