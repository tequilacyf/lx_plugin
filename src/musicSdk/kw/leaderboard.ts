import { httpFetch } from '../request'
import { decodeName, formatPlayTime, sizeFormate } from '../utils'
import { formatSinger, formatPic, wbdCrypto } from './util'

const boards = [
  { id: '93', name: '酷我飙升榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/soubiao.png' },
  { id: '92', name: '酷我新歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/xinge.png' },
  { id: '17', name: '酷我热歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/rege.png' },
  { id: '16', name: '酷我流行指数榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/liuxing.png' },
  { id: '22', name: '内地榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/neidi.png' },
  { id: '23', name: '欧美榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/oumei.png' },
  { id: '24', name: '港台榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gangtai.png' },
  { id: '25', name: '韩半岛榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/hanban.png' },
  { id: '26', name: '日本榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/riben.png' },
  { id: '27', name: '抖音榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/douyin.png' },
  { id: '28', name: 'ACG榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/acg.png' },
  { id: '29', name: '公共版权榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gonggong.png' },
  { id: '91', name: '酷我会员榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/huiyuan.png' },
  { id: '30', name: '酷我飙升榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/soubiao.png' },
  { id: '31', name: '酷我新歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/xinge.png' },
  { id: '32', name: '酷我热歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/rege.png' },
  { id: '33', name: '酷我流行指数榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/liuxing.png' },
  { id: '34', name: '内地榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/neidi.png' },
  { id: '35', name: '欧美榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/oumei.png' },
  { id: '36', name: '港台榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gangtai.png' },
  { id: '37', name: '韩半岛榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/hanban.png' },
  { id: '38', name: '日本榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/riben.png' },
  { id: '39', name: '抖音榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/douyin.png' },
  { id: '40', name: 'ACG榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/acg.png' },
  { id: '41', name: '公共版权榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gonggong.png' },
  { id: '42', name: '酷我会员榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/huiyuan.png' },
  { id: '43', name: '酷我飙升榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/soubiao.png' },
  { id: '44', name: '酷我新歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/xinge.png' },
  { id: '45', name: '酷我热歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/rege.png' },
  { id: '46', name: '酷我流行指数榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/liuxing.png' },
  { id: '47', name: '内地榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/neidi.png' },
  { id: '48', name: '欧美榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/oumei.png' },
  { id: '49', name: '港台榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gangtai.png' },
  { id: '50', name: '韩半岛榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/hanban.png' },
  { id: '51', name: '日本榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/riben.png' },
  { id: '52', name: '抖音榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/douyin.png' },
  { id: '53', name: 'ACG榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/acg.png' },
  { id: '54', name: '公共版权榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gonggong.png' },
  { id: '55', name: '酷我会员榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/huiyuan.png' },
  { id: '56', name: '酷我飙升榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/soubiao.png' },
  { id: '57', name: '酷我新歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/xinge.png' },
  { id: '58', name: '酷我热歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/rege.png' },
  { id: '59', name: '酷我流行指数榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/liuxing.png' },
  { id: '60', name: '内地榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/neidi.png' },
  { id: '61', name: '欧美榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/oumei.png' },
  { id: '62', name: '港台榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gangtai.png' },
  { id: '63', name: '韩半岛榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/hanban.png' },
  { id: '64', name: '日本榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/riben.png' },
  { id: '65', name: '抖音榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/douyin.png' },
  { id: '66', name: 'ACG榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/acg.png' },
  { id: '67', name: '公共版权榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/gonggong.png' },
  { id: '68', name: '酷我会员榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/huiyuan.png' },
  { id: '85', name: '酷我飙升榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/soubiao.png' },
  { id: '86', name: '酷我新歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/xinge.png' },
  { id: '87', name: '酷我热歌榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/rege.png' },
  { id: '88', name: '酷我流行指数榜', img: 'http://kwimg.52kuwo.cn/other/newranklist/liuxing.png' },
]

const filterData = (nMinfo: string): any[] => {
  const regex = /level:(\w+),bitrate:(\d+),format:(\w+),size:([\w.]+)/g
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

  return Object.entries(qualityMap).map(([type, size]) => ({
    type,
    size: size ? sizeFormate(parseFloat(size) * 1024 * 1024) : null,
  }))
}

const parseBoardData = (rawData: any): any[] => {
  const songs: any[] = []

  if (!rawData) return songs

  const musicList = rawData.musicList || rawData.list || rawData
  if (!Array.isArray(musicList)) return songs

  for (const item of musicList) {
    const songmid = String(item.rid || '')
    if (!songmid) continue

    const song = {
      name: decodeName(item.name || ''),
      singer: formatSinger(decodeName(item.artist || '')),
      source: 'kw',
      songmid,
      albumId: String(item.albumId || ''),
      interval: formatPlayTime(parseInt(item.duration || '0', 10)),
      albumName: decodeName(item.album || ''),
      img: formatPic(item.pic || '', 500) || null,
      lrc: null as string | null,
      otherSource: null,
      types: [] as any[],
      _types: {} as Record<string, any>,
      typeUrl: {} as Record<string, string>,
    }

    const nMinfo = item.n_minfo || ''
    const types = nMinfo ? filterData(nMinfo) : []

    for (const t of types) {
      song.types.push(t)
      song._types[t.type] = {}
    }

    if (song.types.length === 0) {
      song.types.push({ type: '128k', size: null })
      song._types['128k'] = {}
    }

    songs.push(song)
  }

  return songs
}

export const getBoards = (): any[] => {
  return boards.map(b => ({
    id: b.id,
    name: b.name,
    img: b.img,
  }))
}

export const getList = async (
  id: string,
  page = 1,
  limit = 30,
): Promise<{
  list: any[]
  info: {
    name: string
    img: string | null
    total: number
  }
  source: string
}> => {
  try {
    const jsonData = {
      burst_type: '0',
      id,
      pn: String(page - 1),
      rn: String(limit),
      order: '1',
    }

    const paramStr = wbdCrypto.buildParam(jsonData)

    const resp = await httpFetch(`https://wbd.kuwo.cn/api/www/bang/bang/musicList?${paramStr}`, {
      method: 'post',
      timeout: 15000,
      headers: {
        'Referer': 'http://www.kuwo.cn/',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }).promise

    if (resp.statusCode !== 200) {
      return {
        list: [],
        info: { name: '', img: null, total: 0 },
        source: 'kw',
      }
    }

    const body = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body

    let rawData: any
    if (body && body.data) {
      const decoded = wbdCrypto.decodeData(body.data)
      rawData = typeof decoded === 'string' ? JSON.parse(decoded) : decoded
    } else {
      rawData = body
    }

    const list = parseBoardData(rawData)

    const boardInfo = boards.find(b => b.id === id)

    return {
      list,
      info: {
        name: boardInfo?.name || decodeName(rawData?.name || ''),
        img: rawData?.pic || boardInfo?.img || null,
        total: parseInt(rawData?.total || String(list.length), 10),
      },
      source: 'kw',
    }
  } catch (err) {
    return {
      list: [],
      info: { name: '', img: null, total: 0 },
      source: 'kw',
    }
  }
}

export default {
  getBoards,
  getList,
}
