import { httpFetch } from '../request'
import { formatPlayTime, sizeFormate } from '../utils'

const qualityMap: Record<string, string> = {
  PQ: '128k',
  HQ: '320k',
  SQ: 'flac',
  ZQ24: 'flac24bit',
}

const mapSongItem = (item: any) => {
  const singerList = item.singers || item.singerList || []
  const singer = singerList.map((s: any) => s.name || '').join('、')

  const types: any[] = []
  const _types: Record<string, any> = {}
  const audioFormats = item.audioFormats || item.rateFormats || []

  const seen = new Set<string>()
  for (const fmt of audioFormats) {
    const formatName = fmt.formatType || fmt.format || ''
    const quality = qualityMap[formatName]
    if (quality && !seen.has(quality)) {
      seen.add(quality)
      types.push({ type: quality, size: null })
      _types[quality] = {}
    }
  }

  if (types.length === 0) {
    types.push({ type: '128k', size: null })
    _types['128k'] = {}
  }

  return {
    name: item.name || item.title || '',
    singer,
    source: 'mg',
    songmid: item.songId || item.id || '',
    copyrightId: item.copyrightId || item.cid || '',
    albumId: item.albumId || (item.album ? item.album.id : '') || '',
    albumName: item.albumName || (item.album ? item.album.name : '') || '',
    interval: formatPlayTime((item.duration || 0) / 1000 || 0),
    img: (item.albumImg || item.coverImg || item.picUrl || null) as string | null,
    lrc: null,
    otherSource: null,
    types,
    _types,
    typeUrl: {},
  }
}

export const getTags = async () => {
  try {
    const resp = await httpFetch(
      'https://app.c.nf.migu.cn/MIGUM3.0/v1.0/playlist/category/list',
      {
        method: 'get',
        headers: { Referer: 'http://music.migu.cn/' },
      },
    ).promise

    if (resp.statusCode !== 200 || !resp.body) {
      return { source: 'mg', tags: [] }
    }

    const data = resp.body.data || []
    const tags = data.map((cat: any) => ({
      id: String(cat.id || cat.categoryId || ''),
      name: cat.name || cat.categoryName || '',
      children: (cat.playlistTags || cat.childList || []).map((tag: any) => ({
        id: String(tag.id || tag.tagId || ''),
        name: tag.name || tag.tagName || '',
      })),
    }))

    return { source: 'mg', tags }
  } catch {
    return { source: 'mg', tags: [] }
  }
}

export const getListDetail = async (id: string, page = 1, limit = 30) => {
  try {
    const resp = await httpFetch(
      `https://app.c.nf.migu.cn/MIGUM3.0/v1.0/playlist/op/playlistDetail?playListId=${encodeURIComponent(id)}&page=${page}&pageSize=${limit}`,
      {
        method: 'get',
        headers: { Referer: 'http://music.migu.cn/' },
      },
    ).promise

    if (resp.statusCode !== 200 || !resp.body) {
      return { list: [], info: { name: '', img: null, total: 0, id } }
    }

    const data = resp.body.data || {}
    const songs = data.songs || data.songList || data.list || []
    const total = data.totalCount || data.songCount || songs.length

    const list = songs.map(mapSongItem)

    return {
      list,
      info: {
        name: data.name || data.title || '',
        img: data.coverUrl || data.imgUrl || null,
        total,
        id,
      },
    }
  } catch {
    return { list: [], info: { name: '', img: null, total: 0, id } }
  }
}

export const searchSongList = async (str: string, page = 1, limit = 30) => {
  try {
    const resp = await httpFetch(
      `https://app.c.nf.migu.cn/MIGUM3.0/v1.0/playlist/search`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'http://music.migu.cn/',
        },
        form: {
          text: str,
          pageIndex: page,
          pageSize: limit,
        },
      },
    ).promise

    if (resp.statusCode !== 200 || !resp.body) {
      return { list: [], allPage: 0, total: 0, limit, source: 'mg' }
    }

    const data = resp.body.data || {}
    const playlists = data.playlist || data.list || []
    const total = data.totalCount || data.total || 0

    const list = playlists.map((item: any) => ({
      id: String(item.playListId || item.id || ''),
      name: item.name || item.title || '',
      img: item.coverUrl || item.imgUrl || null,
      total: item.songCount || item.total || 0,
      source: 'mg',
    }))

    return { list, allPage: Math.ceil(total / limit), total, limit, source: 'mg' }
  } catch {
    return { list: [], allPage: 0, total: 0, limit, source: 'mg' }
  }
}

export default { getTags, getListDetail, searchSongList }
