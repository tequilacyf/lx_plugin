import { httpFetch } from '../request'
import { decodeLyric } from './util'

const buildXorParams = (songmid: string): string => {
  const key = 'yeelion'
  const params: Record<string, string> = {
    server: 'newlyric.kuwo.cn',
    type: 'kw_player_lyr',
    rid: songmid.replace('MUSIC_', ''),
    decode: '1',
  }

  let str = ''
  for (const [k, v] of Object.entries(params)) {
    let encoded = ''
    for (let i = 0; i < v.length; i++) {
      encoded += String.fromCharCode(v.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    str += `${k}=${encodeURIComponent(encoded)}&`
  }

  return str.slice(0, -1)
}

export const getLyric = async (
  songInfo: any,
  isGetLyricx = false,
): Promise<{ lyric: string; tlyric?: string; rlyric?: string; yrc?: string }> => {
  const songmid = songInfo.songmid || ''
  if (!songmid) {
    return { lyric: '' }
  }

  const result: { lyric: string; tlyric?: string; rlyric?: string; yrc?: string } = {
    lyric: '',
  }

  try {
    const xorParams = buildXorParams(songmid)
    const url = `http://newlyric.kuwo.cn/dl/lyric?${xorParams}`

    const resp = await httpFetch(url, {
      method: 'get',
      timeout: 15000,
      headers: {
        'Referer': 'http://www.kuwo.cn/',
      },
    }).promise

    if (resp.statusCode !== 200 || !resp.body) {
      return result
    }

    const body = typeof resp.body === 'string' ? resp.body : ''

    if (!body) return result

    let lrcBase64 = ''
    let tlrcBase64 = ''
    let rlrcBase64 = ''

    try {
      const parsed = typeof resp.body === 'object' ? resp.body : JSON.parse(body)
      if (parsed) {
        if (parsed.lyric) lrcBase64 = parsed.lyric
        if (parsed.tlyric) tlrcBase64 = parsed.tlyric
        if (parsed.rlrc) rlrcBase64 = parsed.rlrc
      }
    } catch (_) {
      // body might be raw base64 or plain text lrc
      if (body.length > 50 && !body.includes('[')) {
        lrcBase64 = body
      } else {
        result.lyric = body
        return result
      }
    }

    if (lrcBase64) {
      result.lyric = await decodeLyric({ lrcBase64, isGetLyricx })
    }

    if (tlrcBase64) {
      result.tlyric = await decodeLyric({ lrcBase64: tlrcBase64, isGetLyricx: false })
    }

    if (rlrcBase64) {
      result.rlyric = await decodeLyric({ lrcBase64: rlrcBase64, isGetLyricx: false })
    }
  } catch (err) {
    // silent
  }

  return result
}

export default { getLyric }
