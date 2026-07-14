import { eapiRequest } from './utils'

function parseYrcLine(line: string): string {
  if (!line) return line
  return line
}

function formatLyric(lrcStr: string): string {
  if (!lrcStr) return ''
  return lrcStr.replace(/\r\n/g, '\n')
}

export const getLyric = async (songInfo: any) => {
  const result: { lyric: string; tlyric?: string; yrc?: string } = { lyric: '' }
  const id = songInfo.songmid || songInfo.id || ''

  if (!id) return result

  const data = {
    id: Number(id),
    lv: -1,
    tv: -1,
    rv: -1,
    kv: -1,
    yv: -1,
    yrv: -1,
  }

  try {
    const body = await eapiRequest('/api/song/lyric/v1', data)

    if (!body) return result

    if (body.lrc?.lyric) {
      result.lyric = formatLyric(body.lrc.lyric)
    }

    if (body.tlyric?.lyric) {
      result.tlyric = formatLyric(body.tlyric.lyric)
    }

    if (body.yrc?.lyric) {
      result.yrc = body.yrc.lyric
    }
  } catch (_) {
    // silent
  }

  return result
}

export default { getLyric }
