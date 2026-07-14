import { formatPlayTime, sizeFormate } from '../utils'
import { eapiRequest } from './utils'

const qualitySizeMap: Record<string, { size: number; key: string }> = {
  flac24bit: { size: 0, key: 'hr' },
  flac: { size: 0, key: 'sq' },
  '320k': { size: 0, key: 'h' },
  '128k': { size: 0, key: 'l' },
}

const brLevelMap: Record<string, string> = {
  lossless: 'flac',
  hires: 'flac24bit',
  sq: 'flac',
  hq: '320k',
  lq: '128k',
}

const qualityMap: Record<string, string> = {
  hr: 'flac24bit',
  sq: 'flac',
  h: '320k',
  l: '128k',
}

const sizeBrMap: Record<string, string> = {
  hr: 'hires',
  sq: 'lossless',
  h: 'hires',
  l: 'standard',
}

const mapSongItem = (item: any, privilege?: any) => {
  const al = item.al || item.album || {}
  const ar = item.ar || item.artists || []
  const id = item.id

  const singer = ar.map((a: any) => a.name).join('、')

  let img = ''
  if (al.picUrl) {
    img = al.picUrl
  } else if (al.pic_str) {
    img = `https://p4.music.126.net/${al.pic_str}/${al.pic_str}.jpg`
  }

  const _types: Record<string, any> = {}

  const hasPrivilege = privilege && privilege[id]
  const maxBr = hasPrivilege ? privilege[id].maxBr : null

  if (maxBr) {
    const levelMap: Record<string, string> = {
      '999000': 'flac24bit',
      '999': 'flac24bit',
      '320000': 'flac',
      '320': 'flac',
      '192000': '320k',
      '192': '320k',
      '128000': '128k',
      '128': '128k',
    }
    const detected = levelMap[maxBr] || '128k'
    for (const [type, _] of Object.entries(qualityMap)) {
      if (qualityMap[type] === detected || qualityMap[type] === '128k') {
        _types[qualityMap[type]] = {}
      }
    }
  } else {
    for (const type of Object.values(qualityMap)) {
      _types[type] = {}
    }
  }

  const types: any[] = []
  const brLevel = hasPrivilege ? privilege[id].maxBrLevel || '' : ''
  for (const [type, _] of Object.entries(qualityMap)) {
    const mappedType = qualityMap[type]
    const size = (item as any)[type] || 0
    if (size > 0) {
      types.push({ type: mappedType, size: sizeFormate(size) })
    } else if (Object.keys(_types).includes(mappedType)) {
      const sizeKey = sizeBrMap[type]
      const sizeFromPrivilege = hasPrivilege && brLevel ? 1 : 0
      types.push({
        type: mappedType,
        size: sizeFromPrivilege ? sizeFormate(99999999) : null,
      })
    }
  }

  if (types.length === 0) {
    types.push({ type: '128k', size: null })
    _types['128k'] = {}
  }

  return {
    name: item.name || '',
    singer,
    source: 'wy',
    songmid: String(id || ''),
    albumId: String(al.id || ''),
    albumName: al.name || '',
    interval: formatPlayTime((item.dt || 0) / 1000),
    img: img || null,
    lrc: null,
    otherSource: null,
    types,
    _types,
    typeUrl: {},
  }
}

export const search = async (str: string, page = 1, limit = 30) => {
  const data = {
    keyword: str,
    pageNum: page,
    pageSize: limit,
    type: 1,
  }

  try {
    const result = await eapiRequest('/api/search/song/list/page', data)
    if (!result || !result.data) {
      return { list: [], allPage: 0, total: 0, limit, source: 'wy' }
    }

    const songArray = result.data.songs || result.data.list || []
    const total = result.data.total || 0
    const privileges = result.data.privileges || {}

    const list = songArray.map((item: any) => mapSongItem(item, privileges))

    return { list, allPage: Math.ceil(total / limit), total, limit, source: 'wy' }
  } catch {
    return { list: [], allPage: 0, total: 0, limit, source: 'wy' }
  }
}

export default { search }
