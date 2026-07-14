import { httpFetch } from '../request'

export const getLyric = async (songInfo: any) => {
  const result: { lyric: string; tlyric?: string } = { lyric: '' }
  const songmid = songInfo.songmid || ''
  if (!songmid) return result

  try {
    const { body, statusCode } = await httpFetch(
      'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg',
      {
        method: 'get',
        headers: { Referer: 'https://y.qq.com/' },
        form: {
          songmid,
          loginUin: '0',
          hostUin: '0',
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: '0',
          platform: 'yqq.json',
          needNewCode: '0',
        },
      },
    ).promise

    if (statusCode !== 200) return result

    if (body.lyric) {
      result.lyric = decodeBase64(body.lyric)
    }

    if (body.trans) {
      result.tlyric = decodeBase64(body.trans)
    }
  } catch (_) {
    // silent
  }

  return result
}

function decodeBase64(str: string): string {
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf-8')
    return decoded
  } catch {
    return str
  }
}

export default { getLyric }
