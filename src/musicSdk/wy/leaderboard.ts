import { formatPlayTime, sizeFormate } from '../utils'
import { weapiRequest } from './utils'

const qualityMap: Record<string, string> = {
  hr: 'flac24bit',
  sq: 'flac',
  h: '320k',
  l: '128k',
}

const boardList = [
  { id: '3779629', name: '云音乐新歌榜' },
  { id: '3778678', name: '云音乐热歌榜' },
  { id: '2884035', name: '云音乐原创榜' },
  { id: '19723756', name: '云音乐飙升榜' },
  { id: '10520166', name: '云音乐电音榜' },
  { id: '10628419', name: '云音乐说唱榜' },
  { id: '109712916', name: '云音乐民谣榜' },
  { id: '112504040', name: '云音乐电子模拟榜' },
  { id: '19937388', name: '云音乐中V榜' },
  { id: '5059631511', name: 'ACG音乐榜' },
  { id: '3786869688', name: '云音乐国风榜' },
  { id: '1507335960', name: '中国新乡村音乐排行榜' },
  { id: '3977000918', name: '古典音乐榜' },
  { id: '1978921795', name: '云音乐扑通浪潮榜' },
  { id: '1899726249', name: '云音乐新声榜' },
  { id: '60198', name: '美国公告榜（Billboard）' },
  { id: '60131', name: '全球榜' },
  { id: '7597334575', name: '日本公信榜' },
  { id: '2719415412', name: '波兰榜' },
  { id: '7444789861', name: '马来西亚榜' },
  { id: '1595049745', name: '英国UK榜单' },
  { id: '71384707', name: '韩国Melon榜' },
  { id: '1179531738', name: 'K-Pop榜' },
  { id: '3777336865', name: '国内HiFi榜' },
  { id: '2597423712', name: '真人秀榜' },
  { id: '2615920501', name: '翻唱榜' },
  { id: '2250011882', name: '云音乐彩铃榜' },
  { id: '2472795516', name: '云音乐小视频榜' },
  { id: '1554097412', name: '美国公告牌热门榜BILLBOARD' },
  { id: '6804298306', name: '同声传译榜' },
  { id: '1924530980', name: '游戏榜' },
  { id: '1681566317', name: '悬疑榜' },
  { id: '1679913758', name: 'Bong音乐榜' },
  { id: '1669134714', name: '纽约榜单' },
  { id: '1657200573', name: '古典榜单' },
  { id: '1621468865', name: '唱歌排行' },
  { id: '1550726539', name: '纯音乐' },
  { id: '1543891394', name: '歌榜' },
  { id: '1539200048', name: '法语音乐榜' },
  { id: '1521516256', name: '原创榜' },
  { id: '1493842769', name: '音乐剧榜单' },
  { id: '1433700938', name: '上榜' },
  { id: '1425176840', name: '剧本杀音乐' },
  { id: '1418242496', name: '音乐台榜' },
  { id: '1317112248', name: '纯音乐榜' },
]

const mapSongItem = (item: any) => {
  const al = item.al || item.album || {}
  const ar = item.ar || item.artists || []
  const id = item.id

  const singer = ar.map((a: any) => a.name).join('、')

  let img = ''
  if (al.picUrl) {
    img = al.picUrl
  } else if (al.pic) {
    img = `https://p4.music.126.net/${al.pic}/${al.pic}.jpg`
  }

  const types: any[] = []
  const _types: Record<string, any> = {}

  for (const [type, mapped] of Object.entries(qualityMap)) {
    const size = (item as any)[type] || 0
    if (size > 0) {
      types.push({ type: mapped, size: sizeFormate(size) })
      _types[mapped] = {}
    }
  }

  if (types.length === 0) {
    types.push({ type: '128k', size: null })
    _types['128k'] = {}
  }

  return {
    name: item.name || '',
    singer,
    source: 'wy',
    songmid: String(id || ''),
    albumId: String(al.id || ''),
    albumName: al.name || '',
    interval: formatPlayTime((item.dt || 0) / 1000),
    img: img || null,
    lrc: null,
    otherSource: null,
    types,
    _types,
    typeUrl: {},
  }
}

export const getBoards = async () => {
  return { source: 'wy', list: boardList }
}

export const getBoardDetail = async (id: string, page = 1, limit = 30) => {
  try {
    const data = { id: Number(id), limit, offset: (page - 1) * limit }
    const body = await weapiRequest('/v3/playlist/detail', data)

    if (!body || !body.playlist) {
      return { list: [], info: { name: '', img: null, total: 0 } }
    }

    const playlist = body.playlist
    const tracks = (playlist.tracks || []).slice(0, limit)
    const list = tracks.map(mapSongItem)

    return {
      list,
      info: {
        name: playlist.name || '',
        img: (playlist.coverImgUrl || playlist.coverUrl || null) as string | null,
        total: playlist.trackCount || tracks.length,
      },
    }
  } catch {
    return { list: [], info: { name: '', img: null, total: 0 } }
  }
}

export default { getBoards, getBoardDetail }
