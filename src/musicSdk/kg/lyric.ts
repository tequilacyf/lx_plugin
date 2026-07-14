import { httpFetch } from '../request'
import { toMD5 } from '../crypto-shim'

const getIntv = (interval: string): number => {
  if (!interval) return 0
  const intvArr = interval.split(':')
  let intv = 0
  let unit = 1
  while (intvArr.length) {
    intv += (Number(intvArr.pop())) * unit
    unit *= 60
  }
  return parseInt(String(intv))
}

const searchLyric = (name: string, hash: string, time: number, tryNum = 0): Promise<{ id: string; accessKey: string; fmt: string } | null> => {
  if (tryNum > 5) return Promise.reject(new Error('歌词获取失败'))

  const url = `http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(name)}&hash=${hash}&timelength=${time}&lrctxt=1`

  return httpFetch(url, {
    headers: {
      'KG-RC': '1',
      'KG-THash': 'expand_search_manager.cpp:852736169:451',
      'User-Agent': 'KuGou2012-9020-ExpandSearchManager',
    },
  }).promise.then(({ body, statusCode }: any) => {
    if (statusCode !== 200) return searchLyric(name, hash, time, ++tryNum)
    if (body.candidates && body.candidates.length) {
      const info = body.candidates[0]
      return {
        id: info.id,
        accessKey: info.accesskey,
        fmt: (info.krctype == 1 && info.contenttype != 1) ? 'krc' : 'lrc',
      }
    }
    return null
  })
}

const getLyricDownload = (id: string, accessKey: string, fmt: string, tryNum = 0): Promise<{ lyric: string; tlyric: string; rlyric: string; yrc: string }> => {
  if (tryNum > 5) return Promise.reject(new Error('歌词获取失败'))

  return httpFetch(`http://lyrics.kugou.com/download?ver=1&client=pc&id=${id}&accesskey=${accessKey}&fmt=${fmt}&charset=utf8`, {
    headers: {
      'KG-RC': '1',
      'KG-THash': 'expand_search_manager.cpp:852736169:451',
      'User-Agent': 'KuGou2012-9020-ExpandSearchManager',
    },
  }).promise.then(({ body, statusCode }: any) => {
    if (statusCode !== 200) return getLyricDownload(id, accessKey, fmt, ++tryNum)

    switch (body.fmt) {
      case 'krc': {
        try {
          const decoded = decodeKrc(body.content)
          return { lyric: decoded, tlyric: '', rlyric: '', yrc: '' }
        } catch {
          return { lyric: Buffer.from(body.content, 'base64').toString('utf-8'), tlyric: '', rlyric: '', yrc: '' }
        }
      }
      case 'lrc':
        return {
          lyric: Buffer.from(body.content, 'base64').toString('utf-8'),
          tlyric: '',
          rlyric: '',
          yrc: '',
        }
      default:
        return Promise.reject(new Error(`未知歌词格式: ${body.fmt}`))
    }
  })
}

const decodeKrc = (content: string): string => {
  const decoded = Buffer.from(content, 'base64')
  const key = [64, 71, 97, 119, 94, 50, 116, 120, 57, 49, 87, 65, 42, 116, 38, 49]
  const result: number[] = []
  for (let i = 0; i < decoded.length; i++) {
    result.push(decoded[i] ^ key[i % key.length])
  }
  return Buffer.from(result).toString('utf-8')
}

const getLyric = (songInfo: any): Promise<{ lyric: string; tlyric: string; rlyric: string; yrc: string }> => {
  return searchLyric(
    songInfo.name,
    songInfo.hash,
    songInfo._interval || getIntv(songInfo.interval),
  ).then(result => {
    if (!result) return Promise.reject(new Error('Get lyric failed'))
    return getLyricDownload(result.id, result.accessKey, result.fmt)
  })
}

export default { getLyric }
