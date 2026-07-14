import { toMD5 } from '../crypto-shim'
import { formatPlayTime, sizeFormate } from '../utils'
import { httpFetch } from '../request'

const signatureMd5 = 'd94df31343ee67a541a4b5e5fbcb24af'
const yyapp2d = 'yyapp2'

const createSignature = (time: string, str: string): string => {
  const input = `${signatureMd5}${time}${str}${signatureMd5}`
  return toMD5(input)
}

const qualityMap: Record<string, string> = {
  PQ: '128k',
  HQ: '320k',
  SQ: 'flac',
  ZQ24: 'flac24bit',
}

const mapSongItem = (item: any) => {
  const singerList = item.singerList || item.singers || []
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

export const search = async (str: string, page = 1, limit = 30) => {
  const time = Date.now().toString()
  const sign = createSignature(time, str)
  const deviceId = 'b342f710a1e1c62b'

  try {
    // Try JSON body first (newer API), fallback to form-urlencoded
    let body: any
    try {
      body = await httpFetch(
        'https://jadeite.migu.cn/music_search/v3/search/searchAll',
        {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            sign,
            deviceId,
            timestamp: time,
            appkey: yyapp2d,
            Referer: 'https://music.migu.cn/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: {
            text: str,
            pageIndex: page,
            pageSize: limit,
            type: '1',
          },
        },
      ).promise
    } catch {
      // Fallback to form
      body = await httpFetch(
        'https://jadeite.migu.cn/music_search/v3/search/searchAll',
        {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            sign,
            deviceId,
            timestamp: time,
            appkey: yyapp2d,
            Referer: 'https://music.migu.cn/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          form: {
            text: str,
            pageIndex: page,
            pageSize: limit,
            type: '1',
          },
        },
      ).promise
    }

    if (body.statusCode !== 200) {
      songloft?.log?.warn(`[mg search] HTTP ${body.statusCode}: ${JSON.stringify(body.body).substring(0, 200)}`)
      return { list: [], allPage: 0, total: 0, limit, source: 'mg' }
    }

    const resultBody = body.body
    if (!resultBody || !resultBody.data) {
      songloft?.log?.warn(`[mg search] no data in response: ${JSON.stringify(resultBody).substring(0, 200)}`)
      return { list: [], allPage: 0, total: 0, limit, source: 'mg' }
    }

    const songArray = resultBody.data.songResult?.result || []
    const total = resultBody.data.songResult?.totalCount || 0

    const list = songArray
      .filter((item: any) => item.songId || item.id)
      .map(mapSongItem)

    return { list, allPage: Math.ceil(total / limit), total, limit, source: 'mg' }
  } catch (err) {
    songloft?.log?.warn(`[mg search] error: ${err?.message || err}`)
    return { list: [], allPage: 0, total: 0, limit, source: 'mg' }
  }
}

export default { search }
