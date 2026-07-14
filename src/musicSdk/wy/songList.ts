import { formatPlayTime, sizeFormate } from '../utils'
import { weapiRequest, eapiRequest } from './utils'

const qualityMap: Record<string, string> = {
  hr: 'flac24bit',
  sq: 'flac',
  h: '320k',
  l: '128k',
}

const brLevelMap: Record<string, string> = {
  lossless: 'flac',
  hires: 'flac24bit',
  sq: 'flac',
  hq: '320k',
  lq: '128k',
}

const mapSongItem = (item: any) => {
  const al = item.al || item.album || {}
  const ar = item.ar || item.artists || []
  const id = item.id

  const singer = ar.map((a: any) => a.name).join('、')

  let img = ''
  if (al.picUrl) {
    img = al.picUrl
  }

  const types: any[] = []
  const _types: Record<string, any> = {}

  for (const [type, mapped] of Object.entries(qualityMap)) {
    const size = (item as any)[type] || 0
    if (size > 0) {
      types.push({ type: mapped, size: sizeFormate(size) })
      _types[mapped] = {}
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

export const getTags = async () => {
  const data = {}
  try {
    const body = await weapiRequest('/v1/playlist/catalogue', data)

    if (!body || !body.data || !body.data.categories) {
      return { source: 'wy', tags: [] }
    }

    const tags = body.data.categories.map((cat: any) => ({
      id: String(cat.id || ''),
      name: cat.name || '',
      children: (cat.ids || []).map((child: any) => ({
        id: String(child.id || child),
        name: child.name || child.description || '',
      })),
    }))

    return { source: 'wy', tags }
  } catch {
    return { source: 'wy', tags: [] }
  }
}

export const getListDetail = async (id: string) => {
  try {
    const data = { id: Number(id), limit: 10000, offset: 0 }
    const body = await weapiRequest('/v3/playlist/detail', data)

    if (!body || !body.playlist) {
      return { list: [], info: { name: '', img: null, total: 0, id } }
    }

    const playlist = body.playlist
    const tracks = playlist.tracks || []
    const list = tracks.map(mapSongItem)

    return {
      list,
      info: {
        name: playlist.name || '',
        img: (playlist.coverImgUrl || playlist.coverUrl || null) as string | null,
        total: playlist.trackCount || tracks.length,
        id,
      },
    }
  } catch {
    return { list: [], info: { name: '', img: null, total: 0, id } }
  }
}

export const searchSongList = async (str: string, page = 1, limit = 30) => {
  const data = {
    keyword: str,
    pageNum: page,
    pageSize: limit,
    type: 1000,
  }

  try {
    const body = await eapiRequest('/api/search/song/list/page', data)

    if (!body || !body.data) {
      return { list: [], allPage: 0, total: 0, limit, source: 'wy' }
    }

    const songArray = body.data.list || []
    const total = body.data.total || 0

    const list = songArray.map((item: any) => ({
      id: String(item.id || item.tid || ''),
      name: item.name || item.title || '',
      img: item.coverUrl || item.coverImgUrl || item.picUrl || null,
      total: item.trackCount || item.songCount || 0,
      source: 'wy',
    }))

    return { list, allPage: Math.ceil(total / limit), total, limit, source: 'wy' }
  } catch {
    return { list: [], allPage: 0, total: 0, limit, source: 'wy' }
  }
}

export default { getTags, getListDetail, searchSongList }
