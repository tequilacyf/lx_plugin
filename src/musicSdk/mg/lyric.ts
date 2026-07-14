import { httpFetch } from '../request'

const TEA_KEY = new Uint8Array([
  0x44, 0x69, 0x76, 0x65, 0x72, 0x73, 0x69, 0x74, 0x79, 0x20, 0x6f, 0x66, 0x20, 0x53, 0x68, 0x61,
  0x6e, 0x67, 0x68, 0x61, 0x69, 0x20, 0x43, 0x6f, 0x6c, 0x6c, 0x65, 0x67, 0x65, 0x20, 0x4d, 0x49,
  0x47, 0x55, 0x33, 0x30,
])

function teaDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  if (data.length % 4 !== 0) return data
  if (data.length < 8) return data

  const n = data.length / 4
  const v = new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    v[i] = (data[i * 4] << 24) | (data[i * 4 + 1] << 16) | (data[i * 4 + 2] << 8) | data[i * 4 + 3]
  }

  const k = new Uint32Array(4)
  for (let i = 0; i < 4; i++) {
    k[i] = (key[i * 4] << 24) | (key[i * 4 + 1] << 16) | (key[i * 4 + 2] << 8) | key[i * 4 + 3]
  }

  const delta = 0x9e3779b9
  const rounds = 32 + Math.floor(52 / n)
  let sum = BigInt(rounds) * BigInt(delta) & 0xffffffffn

  let y = BigInt(v[0])
  let z = BigInt(v[n - 1])

  for (let r = 0; r < rounds; r++) {
    z = (z - BigInt(k[Number((sum >> 2n) & 3n)])) & 0xffffffffn
    z = (z - ((y >> 5n) ^ (y << 4n))) & 0xffffffffn
    z = (z - sum) & 0xffffffffn

    y = (y - BigInt(k[Number(((sum - BigInt(delta)) >> 2n) & 3n)])) & 0xffffffffn
    y = (y - ((z >> 5n) ^ (z << 4n))) & 0xffffffffn
    y = (y - (sum - BigInt(delta))) & 0xffffffffn

    sum = (sum - BigInt(delta)) & 0xffffffffn
  }

  const result = new Uint8Array(data.length)
  const out = new Uint32Array([Number(y), Number(z), ...v.slice(2)])
  for (let i = 0; i < n; i++) {
    result[i * 4] = (out[i] >> 24) & 0xff
    result[i * 4 + 1] = (out[i] >> 16) & 0xff
    result[i * 4 + 2] = (out[i] >> 8) & 0xff
    result[i * 4 + 3] = out[i] & 0xff
  }

  return result
}

function uint8ArrayToString(arr: Uint8Array): string {
  let result = ''
  for (let i = 0; i < arr.length; i++) {
    result += String.fromCharCode(arr[i])
  }
  return result
}

function base64ToUint8Array(str: string): Uint8Array {
  const buf = Buffer.from(str, 'base64')
  return new Uint8Array(buf)
}

function parseSimpleLrc(lrc: string): string {
  if (!lrc) return ''
  return lrc.replace(/\r\n/g, '\n')
}

export const getLyric = async (songInfo: any) => {
  const result: { lyric: string; tlyric?: string } = { lyric: '' }
  const songmid = songInfo.songmid || songInfo.id || ''

  if (!songmid) return result

  const copyrightId = songInfo.copyrightId || ''

  if (copyrightId) {
    try {
      const url = `http://music.migu.cn/v3/api/music/audioPlayer/getLyric?copyrightId=${encodeURIComponent(copyrightId)}`
      const resp = await httpFetch(url, {
        method: 'get',
        headers: {
          Referer: 'http://music.migu.cn/',
        },
      }).promise

      if (resp.statusCode === 200 && resp.body) {
        const body = resp.body
        if (body.lyric) {
          const lrcBytes = base64ToUint8Array(body.lyric)
          const decrypted = teaDecrypt(lrcBytes, TEA_KEY)
          let lrcText = uint8ArrayToString(decrypted)

          const nullIdx = lrcText.indexOf('\0')
          if (nullIdx >= 0) lrcText = lrcText.substring(0, nullIdx)

          result.lyric = parseSimpleLrc(lrcText)
        }
      }
    } catch (_) {
      // silent
    }
  }

  if (!result.lyric) {
    try {
      const url = `http://music.migu.cn/v3/api/music/audioPlayer/getLyric?songId=${encodeURIComponent(songmid)}`
      const resp = await httpFetch(url, {
        method: 'get',
        headers: {
          Referer: 'http://music.migu.cn/',
        },
      }).promise

      if (resp.statusCode === 200 && resp.body) {
        const body = resp.body
        if (body.lyric) {
          const lrcBytes = base64ToUint8Array(body.lyric)
          const decrypted = teaDecrypt(lrcBytes, TEA_KEY)
          let lrcText = uint8ArrayToString(decrypted)

          const nullIdx = lrcText.indexOf('\0')
          if (nullIdx >= 0) lrcText = lrcText.substring(0, nullIdx)

          result.lyric = parseSimpleLrc(lrcText)
        }
      }
    } catch (_) {
      // silent
    }
  }

  if (!result.lyric) {
    try {
      const resp = await httpFetch(
        `https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do`,
        {
          method: 'post',
          headers: {
            Referer: 'http://music.migu.cn/',
          },
          form: {
            resourceType: 'song',
            resourceId: songmid,
          },
        },
      ).promise

      if (resp.statusCode === 200 && resp.body && resp.body.resource?.lyrics) {
        const lyrics = resp.body.resource.lyrics
        for (const l of lyrics) {
          if (l.lyricUrl && l.type === 1) {
            const lrcResp = await httpFetch(l.lyricUrl, { method: 'get' }).promise
            if (lrcResp.statusCode === 200 && lrcResp.body) {
              result.lyric = typeof lrcResp.body === 'string' ? lrcResp.body : JSON.stringify(lrcResp.body)
            }
            break
          }
        }
      }
    } catch (_) {
      // silent
    }
  }

  return result
}

export default { getLyric }
