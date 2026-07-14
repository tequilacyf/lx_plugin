import { httpFetch } from '../request'
import { formatPlayTime, sizeFormate, formatSingerName } from '../utils'

const deviceInfo = {
  sid: '',
  uid: 0,
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
  time: 0,
  agent_fresh: 0,
  agent_type: 0,
  agent_chat: 0,
  build_version: '8.5.0.1842',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  platform: 'win32',
  tmeVersion: '8.5.0',
}

const qualityMap: Record<string, string> = {
  size_128mp3: '128k',
  size_320mp3: '320k',
  size_flac: 'flac',
  size_hires: 'flac24bit',
}

const boardList = [
  { id: '4', name: 'QQ音乐巅峰榜-流行指数榜' },
  { id: '26', name: 'QQ音乐巅峰榜-内地榜' },
  { id: '27', name: 'QQ音乐巅峰榜-香港地区榜' },
  { id: '28', name: 'QQ音乐巅峰榜-台湾地区榜' },
  { id: '29', name: 'QQ音乐巅峰榜-欧美榜' },
  { id: '30', name: 'QQ音乐巅峰榜-韩国榜' },
  { id: '31', name: 'QQ音乐巅峰榜-日本榜' },
  { id: '32', name: 'QQ音乐巅峰榜-法国榜' },
  { id: '33', name: 'QQ音乐巅峰榜-德国榜' },
  { id: '34', name: 'QQ音乐巅峰榜-泰国榜' },
  { id: '57', name: 'QQ音乐巅峰榜-马来西亚榜' },
  { id: '58', name: 'QQ音乐巅峰榜-新加坡榜' },
  { id: '59', name: 'QQ音乐巅峰榜-越南榜' },
  { id: '60', name: 'QQ音乐巅峰榜-印度榜' },
  { id: '61', name: 'QQ音乐巅峰榜-英国榜' },
  { id: '62', name: 'QQ音乐巅峰榜-西班牙榜' },
  { id: '63', name: 'QQ音乐巅峰榜-意大利榜' },
  { id: '64', name: 'QQ音乐巅峰榜-加拿大榜' },
  { id: '65', name: 'QQ音乐巅峰榜-澳大利亚榜' },
  { id: '66', name: 'QQ音乐巅峰榜-菲律宾榜' },
  { id: '67', name: 'QQ音乐巅峰榜-印度尼西亚榜' },
  { id: '68', name: 'QQ音乐巅峰榜-巴西榜' },
  { id: '69', name: 'QQ音乐巅峰榜-俄罗斯榜' },
  { id: '70', name: 'QQ音乐巅峰榜-土耳其榜' },
  { id: '71', name: 'QQ音乐巅峰榜-中东榜' },
  { id: '5', name: 'QQ音乐巅峰榜-新歌榜' },
  { id: '3', name: 'QQ音乐巅峰榜-热歌榜' },
  { id: '62', name: 'QQ音乐巅峰榜-飙升榜' },
  { id: '201', name: 'QQ音乐巅峰榜-网络歌曲榜' },
  { id: '202', name: 'QQ音乐巅峰榜-影视金曲榜' },
  { id: '203', name: 'QQ音乐巅峰榜-综艺新歌榜' },
  { id: '204', name: 'QQ音乐巅峰榜-电音榜' },
  { id: '205', name: 'QQ音乐巅峰榜-ACG榜' },
  { id: '206', name: 'QQ音乐巅峰榜-国风榜' },
  { id: '207', name: 'QQ音乐巅峰榜-说唱榜' },
  { id: '208', name: 'QQ音乐巅峰榜-民谣榜' },
  { id: '209', name: 'QQ音乐巅峰榜-摇滚榜' },
  { id: '210', name: 'QQ音乐巅峰榜-爵士榜' },
  { id: '211', name: 'QQ音乐巅峰榜-古典榜' },
  { id: '212', name: 'QQ音乐巅峰榜-K-POP榜' },
  { id: '213', name: 'QQ音乐巅峰榜-怀旧榜' },
  { id: '214', name: 'QQ音乐巅峰榜-新兴榜' },
  { id: '215', name: 'QQ音乐巅峰榜-达人榜' },
  { id: '216', name: 'QQ音乐巅峰榜-听书榜' },
  { id: '217', name: 'QQ音乐巅峰榜-电影榜' },
  { id: '218', name: 'QQ音乐巅峰榜-电视剧榜' },
  { id: '219', name: 'QQ音乐巅峰榜-综艺榜' },
  { id: '220', name: 'QQ音乐巅峰榜-儿童榜' },
  { id: '221', name: 'QQ音乐巅峰榜-广场舞榜' },
  { id: '222', name: 'QQ音乐巅峰榜-键盘榜' },
  { id: '223', name: 'QQ音乐巅峰榜-小提琴榜' },
  { id: '224', name: 'QQ音乐巅峰榜-古筝榜' },
  { id: '225', name: 'QQ音乐巅峰榜-钢琴榜' },
  { id: '226', name: 'QQ音乐巅峰榜-吉他榜' },
  { id: '227', name: 'QQ音乐巅峰榜-口琴榜' },
  { id: '228', name: 'QQ音乐巅峰榜-二胡榜' },
  { id: '229', name: 'QQ音乐巅峰榜-笛子榜' },
  { id: '230', name: 'QQ音乐巅峰榜-萨克斯榜' },
  { id: '231', name: 'QQ音乐巅峰榜-唢呐榜' },
]

const mapSongItem = (item: any) => {
  const file = item.file || {}
  const album = item.album || {}
  const singer = item.singer || []
  const songmid = item.mid || ''

  const types: any[] = []
  const _types: Record<string, any> = {}

  for (const [key, type] of Object.entries(qualityMap)) {
    const size = (file as any)[key] || 0
    if (size > 0) {
      types.push({ type, size: sizeFormate(size) })
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

  return {
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
  }
}

export const getBoards = async () => {
  return { source: 'tx', list: boardList }
}

export const getBoardDetail = async (id: string, page = 1, limit = 30) => {
  const data = {
    comm: deviceInfo,
    req: {
      method: 'GetMusicTopListInfo',
      module: 'music.toplist.ToplistInfoServer',
      parameter: {
        topid: Number(id),
        offset: (page - 1) * limit,
        num: limit,
        platform: 'smartbox',
      },
    },
  }

  try {
    const { body, statusCode } = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    }).promise

    if (statusCode !== 200) return { list: [], info: { name: '', img: null, total: 0 } }

    const topList = body?.req?.data?.data?.songList || []
    const info = body?.req?.data?.data?.topListInfo || {}
    const list = topList.map(mapSongItem)

    return {
      list,
      info: {
        name: info.title || info.topTitle || '',
        img: info.picUrl || null,
        total: info.totalNum || list.length,
      },
    }
  } catch {
    return { list: [], info: { name: '', img: null, total: 0 } }
  }
}

export default { getBoards, getBoardDetail }
