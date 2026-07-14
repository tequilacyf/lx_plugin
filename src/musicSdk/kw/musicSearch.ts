import { httpFetch } from '../request'
import { decodeName, formatPlayTime, sizeFormate } from '../utils'
import { formatSinger, formatPic, matchToken } from './util'

let kwTokenCache = ''
let kwTokenExpiry = 0

async function ensureToken(): Promise<string> {
  if (kwTokenCache && Date.now() < kwTokenExpiry) return kwTokenCache
  try {
    const resp = await fetch('http://www.kuwo.cn/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const headers: Record<string, string> = {}
    if (resp.headers && typeof resp.headers.forEach === 'function') {
      resp.headers.forEach((v: string, k: string) => { headers[k] = v })
    }
    const token = matchToken(headers) || ''
    if (token) {
      songloft?.log?.info(`[kw token] obtained token: ${token}`)
      kwTokenCache = token
      kwTokenExpiry = Date.now() + 600000
    } else {
      songloft?.log?.warn(`[kw token] no token in response headers, headers=${JSON.stringify(headers)}`)
    }
    return token
  } catch (err: any) {
    songloft?.log?.warn(`[kw token] fetch failed: ${err?.message || err}`)
    return kwTokenCache || ''
  }
}

const searchMusic = (str: string, page: number, limit: number, token: string) => {
  const params = [
    'client=kt',
    `all=${encodeURIComponent(str)}`,
    `pn=${page - 1}`,
    `rn=${limit}`,
    'uid=794764771',
    'ver=kwplayer_ar_9.2.2.1',
    'vipver=1',
    'show_copyright_offline=1',
    'newver=1',
    'ft=music',
    'cluster=0',
    'strategy=2',
    'encoding=utf8',
    'rformat=json',
    'vermerge=1',
    'moession=1',
    'issubtitle=1',
  ].join('&')

  return httpFetch(`http://search.kuwo.cn/r.s?${params}`, {
    method: 'get',
    timeout: 15000,
    headers: {
      'Referer': 'http://www.kuwo.cn/',
      'csrf': token,
      'Cookie': `kw_token=${token}`,
    },
  })
}

const handleResult = (rawData: any): any[] => {
  const regex = /level:(\w+),bitrate:(\d+),format:(\w+),size:([\w.]+)/g
  const songs: any[] = []

  if (!rawData || !rawData.abslist) return songs

  for (const item of rawData.abslist) {
    const musicrid = item.MUSICRID || ''
    const songmid = musicrid.replace('MUSIC_', '')
    if (!songmid) continue

    const song = {
      name: decodeName(item.SONGNAME || ''),
      singer: formatSinger(decodeName(item.ARTIST || '')),
      source: 'kw',
      songmid,
      albumId: (item.ALBUMID || '').replace('ALBUM_', ''),
      interval: formatPlayTime(parseInt(item.DURATION || '0', 10)),
      albumName: decodeName(item.ALBUM || ''),
      img: formatPic(item.web_albumpic_short || item.prob_albumpic || '', 500) || null,
      lrc: null as string | null,
      otherSource: null,
      types: [] as any[],
      _types: {} as Record<string, any>,
      typeUrl: {} as Record<string, string>,
    }

    const nMinfo = item.N_MINFO || ''
    const qualityMap: Record<string, string> = {}

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

    for (const [type, size] of Object.entries(qualityMap)) {
      song.types.push({ type, size: sizeFormate(parseFloat(size) * 1024 * 1024) })
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

export const search = async (
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
  let retryCount = 0
  const maxRetry = 3

  while (retryCount < maxRetry) {
    try {
      const token = await ensureToken()
      const { body, statusCode } = await searchMusic(str, page, limit, token).promise

      if (statusCode !== 200) {
        songloft?.log?.warn(`[kw search] HTTP ${statusCode}: ${typeof body === 'string' ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200)}`)
        throw new Error(`HTTP ${statusCode}`)
      }

      let rawData: any
      if (typeof body === 'string') {
        try {
          rawData = JSON.parse(body)
        } catch (_) {
          rawData = body
        }
      } else {
        rawData = body
      }

      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData)
        } catch (_) {
          // keep as is
        }
      }

      if (!rawData || !rawData.abslist) {
        songloft?.log?.warn(`[kw search] no abslist in response, keys=${Object.keys(rawData || {}).join(',')}, body=${JSON.stringify(rawData).substring(0, 300)}`)
      }

      const total = parseInt(rawData.TOTAL || rawData.total || '0', 10)
      const allPage = Math.ceil(total / limit)
      const list = handleResult(rawData)

      return {
        list,
        allPage,
        total,
        limit,
        source: 'kw',
      }
    } catch (err) {
      retryCount++
      if (retryCount >= maxRetry) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
    }
  }

  return { list: [], allPage: 0, total: 0, limit, source: 'kw' }
}

export default { search }
