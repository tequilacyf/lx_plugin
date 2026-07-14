import kw from './kw'
import kg from './kg'
import tx from './tx'
import wy from './wy'
import mg from './mg'
import { sizeFormate, decodeName, formatPlayTime, dateFormat, formatPlayCount, formatSingerName } from './utils'

export { sizeFormate, decodeName, formatPlayTime, dateFormat, formatPlayCount, formatSingerName }

export const sources = [
  { id: 'kw', name: '酷我音乐' },
  { id: 'kg', name: '酷狗音乐' },
  { id: 'tx', name: 'QQ音乐' },
  { id: 'wy', name: '网易云音乐' },
  { id: 'mg', name: '咪咕音乐' },
]

export const platforms: Record<string, any> = { kw, kg, tx, wy, mg }

export function getSource(id: string): any {
  return platforms[id]
}

export async function initAll(): Promise<void> {
  // musicSdk platforms are stateless, no init needed
}

export default {
  sources,
  kw,
  kg,
  tx,
  wy,
  mg,
  init: initAll,
  getSource,
}
