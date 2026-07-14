import { httpFetch } from '../request'
import { formatPlayTime, sizeFormate, formatSingerName } from '../utils'

const searchMusic = (str: string, page: number, limit: number) => {
  const deviceInfo = {
    sid: '',
    uid: Math.floor(Math.random() * 100000000),
    current_flows: 0,
    IsNotify: 0,
    tmeLoginType: 2,
    tmeAppID: 'qqmusic',
    grey_city: 1,
    tmeLoginAccount: 0,
    login_type: 0,
    qq: 0,
    ad: 0,
    secret: '',
    ip: '',
    time: Date.now(),
    agent_fresh: 0,
    agent_type: 0,
    agent_chat: 0,
    build_version: '8.5.0.1842',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'win32',
    tmeVersion: '8.5.0',
  }

  const data = {
    comm: deviceInfo,
    req: {
      method: 'DoSearchForQQMusicMobile',
      module: 'music.search.SearchCgiService',
      parameter: { query: str, search_type: 0, page_num: page, num_per_page: limit },
    },
  }
  return httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://y.qq.com/',
    },
    body: data,
  })
}

const handleResult = (rawData: any): any[] => {
  const songs: any[] = []
  const list = rawData?.req?.data?.body?.song?.list
  if (!list) return songs

  for (const item of list) {
    const songmid = item.mid || ''
    if (!songmid) continue

    const file = item.file || {}
    const album = item.album || {}
    const singer = item.singer || []

    const types: any[] = []
    const _types: Record<string, any> = {}
    const qualityMap: Record<string, { size: number; key: string }> = {
      '128k': { size: file.size_128mp3 || 0, key: 'size_128mp3' },
      '320k': { size: file.size_320mp3 || 0, key: 'size_320mp3' },
      flac: { size: file.size_flac || 0, key: 'size_flac' },
      flac24bit: { size: file.size_hires || 0, key: 'size_hires' },
    }

    for (const [type, info] of Object.entries(qualityMap)) {
      if (info.size && info.size > 0) {
        types.push({ type, size: sizeFormate(info.size) })
        _types[type] = {}
      }
    }

    if (types.length === 0) {
      types.push({ type: '128k', size: null })
      _types['128k'] = {}
    }

    let img = ''
    if (album.mid) {
      img = `https://y.qq.com/music/photo_new/T002R300x300M101${album.mid}.jpg`
    } else if (singer.length > 0 && singer[0].mid) {
      img = `https://y.qq.com/music/photo_new/T001R300x300M101${singer[0].mid}.jpg`
    }

    songs.push({
      name: item.name + (item.title_extra || ''),
      singer: formatSingerName(singer),
      source: 'tx',
      songmid,
      strMediaMid: file.media_mid || '',
      albumId: album.mid || '',
      albumName: album.name || '',
      interval: formatPlayTime(item.interval || 0),
      img: img || null,
      lrc: null,
      otherSource: null,
      types,
      _types,
      typeUrl: {},
    })
  }

  return songs
}

export const search = async (str: string, page = 1, limit = 30) => {
  let retryCount = 0
  const maxRetry = 3

  while (retryCount < maxRetry) {
    try {
      const { body, statusCode } = await searchMusic(str, page, limit).promise

      if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`)

      const total = body?.req?.data?.body?.song?.totalNum || 0
      const allPage = Math.ceil(total / limit)
      const list = handleResult(body)

      return { list, allPage, total, limit, source: 'tx' }
    } catch (err) {
      retryCount++
      if (retryCount >= maxRetry) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
    }
  }

  return { list: [], allPage: 0, total: 0, limit, source: 'tx' }
}

export default { search }
