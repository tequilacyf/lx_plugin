import { httpFetch } from '../request'
import { decodeName, formatPlayTime, sizeFormate } from '../utils'
import { formatSinger, formatPic } from './util'

interface TagItem {
  id: string
  name: string
  children?: TagItem[]
}

const WAPI_BASE = 'https://wapi.kuwo.cn/api'

export const getTags = async (source = 'kw'): Promise<{
  source: string
  tags: TagItem[]
}> => {
  try {
    const resp = await httpFetch(`${WAPI_BASE}/wwwclass/index?classid=1&prod=kwplayer_ar_9.2.2.1&vipver=1&encoding=utf8`, {
      method: 'get',
      timeout: 15000,
      headers: {
        'Referer': 'http://www.kuwo.cn/',
      },
    }).promise

    if (resp.statusCode !== 200) return { source, tags: [] }

    const body = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body
    if (!body || !body.data) return { source, tags: [] }

    const tags: TagItem[] = body.data.map((item: any) => ({
      id: String(item.id),
      name: decodeName(item.name || ''),
      children: (item.list || []).map((child: any) => ({
        id: String(child.id),
        name: decodeName(child.name || ''),
      })),
    }))

    return { source, tags }
  } catch (err) {
    return { source, tags: [] }
  }
}

export const getHotTags = async (source = 'kw'): Promise<{
  source: string
  tags: TagItem[]
}> => {
  try {
    const resp = await httpFetch(`${WAPI_BASE}/wwwclass/index?classid=53&prod=kwplayer_ar_9.2.2.1&vipver=1&encoding=utf8`, {
      method: 'get',
      timeout: 15000,
      headers: {
        'Referer': 'http://www.kuwo.cn/',
      },
    }).promise

    if (resp.statusCode !== 200) return { source, tags: [] }

    const body = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body
    if (!body || !body.data) return { source, tags: [] }

    const tags: TagItem[] = body.data.map((item: any) => ({
      id: String(item.id),
      name: decodeName(item.name || ''),
    }))

    return { source, tags }
  } catch (err) {
    return { source, tags: [] }
  }
}

const parseListResult = (rawData: any): any[] => {
  const songs: any[] = []
  const regex = /level:(\w+),bitrate:(\d+),format:(\w+),size:([\w.]+)/g

  if (!rawData || !rawData.musicList) return songs

  for (const item of rawData.musicList) {
    const musicrid = item.rid ? `MUSIC_${item.rid}` : (item.MUSICRID || '')
    const songmid = String(item.rid || musicrid.replace('MUSIC_', ''))
    if (!songmid) continue

    const song = {
      name: decodeName(item.name || item.SONGNAME || ''),
      singer: formatSinger(decodeName(item.artist || item.ARTIST || '')),
      source: 'kw',
      songmid,
      albumId: String(item.albumId || item.ALBUMID || '').replace('ALBUM_', ''),
      interval: formatPlayTime(parseInt(item.duration || item.DURATION || '0', 10)),
      albumName: decodeName(item.album || item.ALBUM || ''),
      img: formatPic(item.pic || item.albumpic || '', 500) || null,
      lrc: null as string | null,
      otherSource: null,
      types: [] as any[],
      _types: {} as Record<string, any>,
      typeUrl: {} as Record<string, string>,
    }

    const nMinfo = item.n_minfo || item.N_MINFO || ''
    const qualityMap: Record<string, string> = {}

    if (nMinfo) {
      let match: RegExpExecArray | null
      while ((match = regex.exec(nMinfo)) !== null) {
        const [, level, bitrate, format, size] = match
        let type = '128k'
        if (bitrate === '320') type = '320k'
        else if (format === 'flac') type = 'flac'
        else if (bitrate === '2000' || bitrate === '1000') type = 'flac24bit'

        if (!qualityMap[type]) {
          qualityMap[type] = size
        }
      }
    }

    if (item.hasLossless || item.hasmv) {
      if (!qualityMap['320k']) qualityMap['320k'] = ''
    }

    for (const [type, size] of Object.entries(qualityMap)) {
      song.types.push({ type, size: size ? sizeFormate(parseFloat(size) * 1024 * 1024) : null })
      song._types[type] = {}
    }

    if (song.types.length === 0) {
      song.types.push({ type: '128k', size: null })
      song._types['128k'] = {}
    }

    songs.push(song)
  }

  return songs
}

export const getListDetail = async (
  id: string,
  tagId: string | number,
  page = 1,
  limit = 30,
): Promise<{
  list: any[]
  info: {
    name: string
    img: string | null
    total: number
    id: string
  }
}> => {
  try {
    const resp = await httpFetch(`${WAPI_BASE}/www/playList/menuDetailInfo?id=${id}&pn=${page - 1}&rn=${limit}&vipver=1&encode=1`, {
      method: 'get',
      timeout: 15000,
      headers: {
        'Referer': 'http://www.kuwo.cn/',
      },
    }).promise

    if (resp.statusCode !== 200) {
      return {
        list: [],
        info: { name: '', img: null, total: 0, id },
      }
    }

    const body = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body
    if (!body || !body.data) {
      return {
        list: [],
        info: { name: '', img: null, total: 0, id },
      }
    }

    const data = body.data
    const list = parseListResult(data)

    return {
      list,
      info: {
        name: decodeName(data.name || ''),
        img: data.img || data.pic || null,
        total: parseInt(data.total || data.num || '0', 10),
        id,
      },
    }
  } catch (err) {
    return {
      list: [],
      info: { name: '', img: null, total: 0, id },
    }
  }
}

export const searchSongList = async (
  str: string,
  page = 1,
  limit = 30,
): Promise<{
  list: any[]
  allPage: number
  total: number
  limit: number
  source: string
}> => {
  try {
    const resp = await httpFetch(`${WAPI_BASE}/www/playList/searchPlayList?key=${encodeURIComponent(str)}&pn=${page - 1}&rn=${limit}&vipver=1&encode=1`, {
      method: 'get',
      timeout: 15000,
      headers: {
        'Referer': 'http://www.kuwo.cn/',
      },
    }).promise

    if (resp.statusCode !== 200) {
      return { list: [], allPage: 0, total: 0, limit, source: 'kw' }
    }

    const body = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body
    if (!body || !body.data) {
      return { list: [], allPage: 0, total: 0, limit, source: 'kw' }
    }

    const total = parseInt(body.data.total || '0', 10)
    const allPage = Math.ceil(total / limit)

    const list = (body.data.list || []).map((item: any) => ({
      id: String(item.id),
      name: decodeName(item.name || ''),
      img: item.img || item.pic || null,
      total: parseInt(item.total || '0', 10),
      author: decodeName(item.uname || item.userName || ''),
    }))

    return { list, allPage, total, limit, source: 'kw' }
  } catch (err) {
    return { list: [], allPage: 0, total: 0, limit, source: 'kw' }
  }
}

export default {
  getTags,
  getHotTags,
  getListDetail,
  searchSongList,
}
