import { httpFetch } from '../request'
import { decodeName, sizeFormate, formatPlayTime, formatSingerName } from '../utils'

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

export const getTags = async () => {
  const data = {
    comm: deviceInfo,
    tag: {
      method: 'get_all_categories',
      module: 'music.socialLib.GetAllCategoriesCgi',
      parameter: {},
    },
  }

  try {
    const { body, statusCode } = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    }).promise

    if (statusCode !== 200) return { source: 'tx', tags: [] }

    const categoryList = body?.tag?.data?.categoryList || []
    const tags: any[] = []
    for (const cat of categoryList) {
      const tagItem: any = { id: cat.id, name: cat.name, children: [] as any[] }
      for (const item of cat.items || []) {
        tagItem.children.push({ id: item.id, name: item.name })
      }
      tags.push(tagItem)
    }
    return { source: 'tx', tags }
  } catch {
    return { source: 'tx', tags: [] }
  }
}

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
    name: decodeName(item.name || '') + (item.title_extra || ''),
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

export const getListDetail = async (id: string, page = 1, limit = 30) => {
  try {
    const { body, statusCode } = await httpFetch(
      'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg',
      {
        method: 'get',
        headers: { Referer: 'https://y.qq.com/' },
        form: {
          type: '1',
          json: '1',
          utf8: '1',
          onlysong: '0',
          new_format: '1',
          disstid: id,
          loginUin: '0',
          hostUin: '0',
          format: 'json',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          notice: '0',
          platform: 'yqq.json',
          needNewCode: '0',
          pagenum: page,
          pagesize: limit,
        },
      },
    ).promise

    if (statusCode !== 200) return { list: [], info: { name: '', img: null, total: 0, id } }

    const data = body?.cdlist?.[0] || {}
    const total = data.totalnum || data.songnum || 0
    const songlist = data.songlist || []

    const list = songlist.map(mapSongItem)

    return {
      list,
      info: {
        name: data.dissname || data.title || '',
        img: data.logo || data.picurl || data.imgurl || null,
        total,
        id,
      },
    }
  } catch {
    return { list: [], info: { name: '', img: null, total: 0, id } }
  }
}

export const searchSongList = async (str: string, page = 1, limit = 30) => {
  const data = {
    comm: deviceInfo,
    req: {
      method: 'DoSearchForQQMusicMobile',
      module: 'music.search.SearchCgiService',
      parameter: {
        query: str,
        search_type: 2,
        page_num: page,
        num_per_page: limit,
      },
    },
  }

  try {
    const { body, statusCode } = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    }).promise

    if (statusCode !== 200) return { list: [], allPage: 0, total: 0, limit, source: 'tx' }

    const songListData = body?.req?.data?.body?.songlist?.list || []
    const total = body?.req?.data?.body?.songlist?.totalNum || 0

    const list = songListData.map((item: any) => ({
      id: item.id || item.tid || '',
      name: decodeName(item.title || item.name || ''),
      img: item.picurl || item.imgurl || null,
      total: item.songnum || item.totalnum || 0,
      source: 'tx',
    }))

    return { list, allPage: Math.ceil(total / limit), total, limit, source: 'tx' }
  } catch {
    return { list: [], allPage: 0, total: 0, limit, source: 'tx' }
  }
}

export default { getTags, getListDetail, searchSongList }
