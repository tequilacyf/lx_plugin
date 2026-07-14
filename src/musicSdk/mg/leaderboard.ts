import { httpFetch } from '../request'
import { formatPlayTime, sizeFormate } from '../utils'

const qualityMap: Record<string, string> = {
  PQ: '128k',
  HQ: '320k',
  SQ: 'flac',
  ZQ24: 'flac24bit',
}

const boardList = [
  { id: '300', name: '咪咕榜-热歌榜' },
  { id: '100', name: '咪咕榜-新歌榜' },
  { id: '200', name: '咪咕榜-原创榜' },
  { id: '400', name: '咪咕榜-销量榜' },
  { id: '500', name: '咪咕榜-彩铃榜' },
  { id: '600', name: '咪咕榜-90后榜' },
  { id: '700', name: '咪咕榜-00后榜' },
  { id: '800', name: '咪咕榜-80后榜' },
  { id: '900', name: '咪咕榜-70后榜' },
  { id: '1000', name: '咪咕榜-网络热歌榜' },
  { id: '1100', name: '咪咕榜-影视榜' },
  { id: '1200', name: '咪咕榜-综艺榜' },
  { id: '1300', name: '咪咕榜-儿童榜' },
  { id: '1400', name: '咪咕榜-古典榜' },
  { id: '1500', name: '咪咕榜-民谣榜' },
  { id: '1600', name: '咪咕榜-摇滚榜' },
  { id: '1700', name: '咪咕榜-说唱榜' },
  { id: '1800', name: '咪咕榜-电子榜' },
  { id: '1900', name: '咪咕榜-国风榜' },
  { id: '2000', name: '咪咕榜-欧美榜' },
  { id: '2100', name: '咪咕榜-韩流榜' },
  { id: '2200', name: '咪咕榜-日语榜' },
  { id: '2300', name: '咪咕榜-粤语榜' },
  { id: '2400', name: '咪咕榜-闽南语榜' },
  { id: '2500', name: '咪咕榜-怀旧榜' },
  { id: '2600', name: '咪咕榜-听书榜' },
  { id: '2700', name: '咪咕榜-知识榜' },
  { id: '2800', name: '咪咕榜-瑜伽榜' },
  { id: '2900', name: '咪咕榜-胎教榜' },
  { id: '3000', name: '咪咕榜-睡眠榜' },
  { id: '3100', name: '咪咕榜-运动榜' },
  { id: '3200', name: '咪咕榜-驾驶榜' },
  { id: '3300', name: '咪咕榜-工作榜' },
  { id: '3400', name: '咪咕榜-学习榜' },
  { id: '3500', name: '咪咕榜-聚会榜' },
  { id: '3600', name: '咪咕榜-咖啡榜' },
  { id: '3700', name: '咪咕榜-夕阳榜' },
  { id: '3800', name: '咪咕榜-雨声榜' },
  { id: '3900', name: '咪咕榜-海浪榜' },
]

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

export const getBoards = async () => {
  return { source: 'mg', list: boardList }
}

export const getBoardDetail = async (id: string, page = 1, limit = 30) => {
  try {
    const resp = await httpFetch(
      'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/querycontentbyId.do',
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'http://music.migu.cn/',
        },
        form: {
          contentId: id,
          pageIndex: page,
          pageSize: limit,
        },
      },
    ).promise

    if (resp.statusCode !== 200 || !resp.body) {
      return { list: [], info: { name: '', img: null, total: 0 } }
    }

    const data = resp.body.data || resp.body.content || {}
    const songs = data.songs || data.results || data.list || []
    const total = data.totalCount || data.songCount || songs.length

    const list = songs.map(mapSongItem)

    return {
      list,
      info: {
        name: data.name || data.title || '',
        img: data.coverUrl || data.imgUrl || null,
        total,
      },
    }
  } catch {
    return { list: [], info: { name: '', img: null, total: 0 } }
  }
}

export default { getBoards, getBoardDetail }
