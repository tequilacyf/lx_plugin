import { httpFetch } from '../request'
import { decodeName, formatPlayTime, sizeFormate, dateFormat, formatPlayCount } from '../utils'
import { formatSingerName } from '../utils'
import { signatureParams, createHttpFetch } from './util'

const sortList = [
  { name: '推荐', id: '5' },
  { name: '最热', id: '6' },
  { name: '最新', id: '7' },
  { name: '热藏', id: '3' },
  { name: '飙升', id: '8' },
]

const getInfoUrl = (tagId?: string) => {
  return tagId
    ? `http://www2.kugou.kugou.com/yueku/v9/special/getSpecial?is_smarty=1&cdn=cdn&t=5&c=${tagId}`
    : 'http://www2.kugou.kugou.com/yueku/v9/special/getSpecial?is_smarty=1&'
}

const getSongListUrl = (sortId: string, tagId?: string, page = 1) => {
  const tag = tagId || ''
  return `http://www2.kugou.kugou.com/yueku/v9/special/getSpecial?is_ajax=1&cdn=cdn&t=${sortId}&c=${tag}&p=${page}`
}

const getSongListDetailUrl = (id: string) => {
  return `http://www2.kugou.kugou.com/yueku/v9/special/single/${id}-5-9999.html`
}

const filterInfoHotTag = (rawData: any): any[] => {
  const result: any[] = []
  if (rawData.status !== 1) return result
  for (const key of Object.keys(rawData.data)) {
    const tag = rawData.data[key]
    result.push({
      id: tag.special_id,
      name: tag.special_name,
      source: 'kg',
    })
  }
  return result
}

const filterTagInfo = (rawData: any): any[] => {
  const result: any[] = []
  for (const name of Object.keys(rawData)) {
    result.push({
      name,
      list: rawData[name].data.map((tag: any) => ({
        parent_id: tag.parent_id,
        parent_name: tag.pname,
        id: tag.id,
        name: tag.name,
        source: 'kg',
      })),
    })
  }
  return result
}

const filterList = (rawData: any[]): any[] => {
  return rawData.map(item => ({
    play_count: item.total_play_count || formatPlayCount(item.play_count),
    id: 'id_' + item.specialid,
    author: item.nickname,
    name: item.specialname,
    time: dateFormat(item.publish_time || item.publishtime, 'Y-M-D'),
    img: item.img || item.imgurl,
    total: item.songcount,
    grade: item.grade,
    desc: item.intro,
    source: 'kg',
  }))
}

const filterData = (rawList: any[]): any[] => {
  return rawList.map(item => {
    const types: any[] = []
    const _types: Record<string, any> = {}

    if (item.filesize !== 0) {
      const size = sizeFormate(item.filesize)
      types.push({ type: '128k', size, hash: item.hash })
      _types['128k'] = { size, hash: item.hash }
    }
    if (item.filesize_320 !== 0) {
      const size = sizeFormate(item.filesize_320)
      types.push({ type: '320k', size, hash: item.hash_320 })
      _types['320k'] = { size, hash: item.hash_320 }
    }
    if (item.filesize_ape !== 0) {
      const size = sizeFormate(item.filesize_ape)
      types.push({ type: 'ape', size, hash: item.hash_ape })
      _types.ape = { size, hash: item.hash_ape }
    }
    if (item.filesize_flac !== 0) {
      const size = sizeFormate(item.filesize_flac)
      types.push({ type: 'flac', size, hash: item.hash_flac })
      _types.flac = { size, hash: item.hash_flac }
    }

    return {
      singer: decodeName(item.singername),
      name: decodeName(item.songname),
      albumName: decodeName(item.album_name),
      albumId: item.album_id,
      songmid: item.audio_id,
      source: 'kg',
      interval: formatPlayTime(item.duration / 1000),
      img: (item.img || item.album_img || '').replace('{size}', '400') || null,
      lrc: null,
      hash: item.hash,
      types,
      _types,
      typeUrl: {},
    }
  })
}

const deDuplication = (datas: any[]) => {
  const ids = new Set<string>()
  return datas.filter(({ hash }) => {
    if (ids.has(hash)) return false
    ids.add(hash)
    return true
  })
}

const createTask = (hashs: any[]) => {
  const data: any = {
    area_code: '1',
    show_privilege: 1,
    show_album_info: '1',
    is_publish: '',
    appid: 1005,
    clientver: 11451,
    mid: '1',
    dfid: '-',
    clienttime: Date.now(),
    key: 'OIlwieks28dk2k092lksi2UIkp',
    fields: 'album_info,author_name,audio_info,ori_audio_name,base,songname,classification,img,album_img',
  }
  const list = [...hashs]
  const tasks: Promise<any[]>[] = []
  while (list.length) {
    tasks.push(createHttpFetch('http://gateway.kugou.com/v3/album_audio/audio', {
      method: 'POST',
      body: { data: list.slice(0, 100), ...data },
      headers: {
        'KG-THash': '13a3164',
        'KG-RC': '1',
        'KG-Fake': '0',
        'KG-RF': '00869891',
        'User-Agent': 'Android712-AndroidPhone-11451-376-0-FeeCacheUpdate-wifi',
        'x-router': 'kmr.service.kugou.com',
      },
    }).then((d: any) => d.map((s: any) => s[0])))
    if (list.length < 100) break
    list.splice(0, 100)
  }
  return tasks
}

const filterData2 = (rawList: any[]): any[] => {
  const ids = new Set<number>()
  const list: any[] = []
  rawList.forEach(item => {
    if (!item) return
    if (ids.has(item.audio_info.audio_id)) return
    ids.add(item.audio_info.audio_id)

    const types: any[] = []
    const _types: Record<string, any> = {}

    if (item.audio_info.filesize !== '0') {
      const size = sizeFormate(parseInt(item.audio_info.filesize))
      types.push({ type: '128k', size, hash: item.audio_info.hash })
      _types['128k'] = { size, hash: item.audio_info.hash }
    }
    if (item.audio_info.filesize_320 !== '0') {
      const size = sizeFormate(parseInt(item.audio_info.filesize_320))
      types.push({ type: '320k', size, hash: item.audio_info.hash_320 })
      _types['320k'] = { size, hash: item.audio_info.hash_320 }
    }
    if (item.audio_info.filesize_flac !== '0') {
      const size = sizeFormate(parseInt(item.audio_info.filesize_flac))
      types.push({ type: 'flac', size, hash: item.audio_info.hash_flac })
      _types.flac = { size, hash: item.audio_info.hash_flac }
    }
    if (item.audio_info.filesize_high !== '0') {
      const size = sizeFormate(parseInt(item.audio_info.filesize_high))
      types.push({ type: 'flac24bit', size, hash: item.audio_info.hash_high })
      _types.flac24bit = { size, hash: item.audio_info.hash_high }
    }

    list.push({
      singer: decodeName(item.author_name),
      name: decodeName(item.songname),
      albumName: decodeName(item.album_info.album_name),
      albumId: item.album_info.album_id,
      songmid: item.audio_info.audio_id,
      source: 'kg',
      interval: formatPlayTime(parseInt(item.audio_info.timelength) / 1000),
      img: (item.img || item.album_info?.sizable_cover || item.audio_info?.trans_param?.union_cover || item.album_info?.pic || item.album_info?.img || item.album_info?.s_img || '').replace('{size}', '400') || null,
      lrc: null,
      hash: item.audio_info.hash,
      otherSource: null,
      types,
      _types,
      typeUrl: {},
    })
  })
  return list
}

const getMusicInfos = async (list: any[]): Promise<any[]> => {
  const deduped = deDuplication(list.map(item => ({ hash: item.hash })))
  const tasks = createTask(deduped)
  const datas = await Promise.all(tasks)
  return filterData2(datas.flat())
}

const regExps = {
  listData: /global\.data = (\[.+\]);/,
  listInfo: /global = {[\s\S]+?name: "(.+)"[\s\S]+?pic: "(.+)"[\s\S]+?};/,
  listDetailLink: /^.+\/(\d+)\.html(?:\?.*|&.*$|#.*$|$)/,
}

const parseHtmlDesc = (html: string): string | null => {
  const prefix = '<div class="pc_specail_text pc_singer_tab_content" id="specailIntroduceWrap">'
  let index = html.indexOf(prefix)
  if (index < 0) return null
  const afterStr = html.substring(index + prefix.length)
  index = afterStr.indexOf('</div>')
  if (index < 0) return null
  return decodeName(afterStr.substring(0, index))
}

const getListDetailBySpecialId = async (id: string, _page: number, tryNum = 0): Promise<any> => {
  if (tryNum > 2) throw new Error('try max num')

  const { body } = await httpFetch(getSongListDetailUrl(id)).promise
  const listDataMatch = body.match(regExps.listData)
  const listInfoMatch = body.match(regExps.listInfo)
  if (!listDataMatch) return getListDetailBySpecialId(id, _page, ++tryNum)
  const list = await getMusicInfos(JSON.parse(listDataMatch[1]))
  let name: string | undefined
  let pic: string | undefined
  if (listInfoMatch) {
    name = listInfoMatch[1]
    pic = listInfoMatch[2]
  }
  const desc = parseHtmlDesc(body)

  return {
    list,
    page: 1,
    limit: 10000,
    total: list.length,
    source: 'kg',
    info: { name, img: pic, desc },
  }
}

const getListInfoByChain = async (chain: string): Promise<any> => {
  const { body } = await httpFetch(`https://m.kugou.com/share/?chain=${chain}&id=${chain}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    },
  }).promise
  const result = body.match(/var\sphpParam\s=\s({.+?});/)
  if (result) return JSON.parse(result[1])
  return null
}

const getUserListDetail3 = async (chain: string, _page: number): Promise<any> => {
  const songInfo = await createHttpFetch(`http://m.kugou.com/schain/transfer?pagesize=10000&chain=${chain}&su=1&page=${_page}&n=0.7928855356604456`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
    },
  })
  if (!songInfo.list) {
    if (songInfo.global_collection_id) return getUserListDetail2(songInfo.global_collection_id)
    throw new Error('get list error')
  }
  const list = await getMusicInfos(songInfo.list)
  return {
    list,
    page: 1,
    limit: 10000,
    total: list.length,
    source: 'kg',
    info: {
      name: songInfo.info.name,
      img: songInfo.info.img,
      author: songInfo.info.username,
    },
  }
}

const createGetListDetail2Task = async (id: string, total: number): Promise<any[]> => {
  const tasks: Promise<any[]>[] = []
  let page = 0
  let remaining = total
  while (remaining) {
    const limit = remaining > 300 ? 300 : remaining
    remaining -= limit
    page += 1
    const params = `appid=1058&global_specialid=${id}&specialid=0&plat=0&version=8000&page=${page}&pagesize=${limit}&srcappid=2919&clientver=20000&clienttime=1586163263991&mid=1586163263991&uuid=1586163263991&dfid=-`
    tasks.push(createHttpFetch(`https://mobiles.kugou.com/api/v5/special/song_v2?${params}&signature=${signatureParams(params, 'web')}`, {
      headers: {
        mid: '1586163263991',
        Referer: 'https://m3ws.kugou.com/share/index.php',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        dfid: '-',
        clienttime: '1586163263991',
      },
    }).then((data: any) => data.info))
  }
  return Promise.all(tasks).then(datas => datas.flat())
}

const getUserListDetail2 = async (global_collection_id: string): Promise<any> => {
  const id = global_collection_id
  if (id.length > 1000) throw new Error('get list error')
  const params = `appid=1058&specialid=0&global_specialid=${id}&format=jsonp&srcappid=2919&clientver=20000&clienttime=1586163242519&mid=1586163242519&uuid=1586163242519&dfid=-`
  const info = await createHttpFetch(`https://mobiles.kugou.com/api/v5/special/info_v2?${params}&signature=${signatureParams(params, 'web')}`, {
    headers: {
      mid: '1586163242519',
      Referer: 'https://m3ws.kugou.com/share/index.php',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
      dfid: '-',
      clienttime: '1586163242519',
    },
  })
  const songInfo = await createGetListDetail2Task(id, info.songcount)
  const list = await getMusicInfos(songInfo)
  return {
    list,
    page: 1,
    limit: 10000,
    total: list.length,
    source: 'kg',
    info: {
      name: info.specialname,
      img: info.imgurl && info.imgurl.replace('{size}', 240),
      desc: info.intro,
      author: info.nickname,
      play_count: formatPlayCount(info.playcount),
    },
  }
}

const getUserListDetailByCode = async (id: string): Promise<any> => {
  const songInfo = await createHttpFetch('http://t.kugou.com/command/', {
    method: 'POST',
    headers: {
      'KG-RC': '1',
      'KG-THash': 'network_super_call.cpp:3676261689:379',
      'User-Agent': '',
    },
    body: { appid: 1001, clientver: 9020, mid: '21511157a05844bd085308bc76ef3343', clienttime: 640612895, key: '36164c4015e704673c588ee202b9ecb8', data: id },
  })
  const info = songInfo.info
  if (info.global_collection_id) return getUserListDetail2(info.global_collection_id)
  if (info.type === 2 && !info.global_collection_id) return getListDetailBySpecialId(info.id, 1)
  throw new Error('unsupported command type')
}

const getUserListDetail = async (link: string, page: number, retryNum = 0): Promise<any> => {
  if (retryNum > 3) return Promise.reject(new Error('link try max num'))
  if (link.includes('#')) link = link.replace(/#.*$/, '')
  if (link.includes('global_collection_id')) return getUserListDetail2(link.replace(/^.*?global_collection_id=(\w+)(?:&.*$|#.*$|$)/, '$1'))
  if (link.includes('chain=')) return getUserListDetail3(link.replace(/^.*?chain=(\w+)(?:&.*$|#.*$|$)/, '$1'), page)

  if (link.includes('.html') && !link.includes('song.html')) {
    return getUserListDetail3(link.replace(/.+\/(\w+).html(?:\?.*|&.*$|#.*$|$)/, '$1'), page)
  }

  const resp = await httpFetch(link, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
      Referer: link,
    },
  }).promise

  if (resp.statusCode > 400) return getUserListDetail(link, page, ++retryNum)
  if (resp.headers.location) {
    const loc = resp.headers.location
    if (loc.includes('global_collection_id')) return getUserListDetail2(loc.replace(/^.*?global_collection_id=(\w+)(?:&.*$|#.*$|$)/, '$1'))
    if (loc.includes('chain=')) return getUserListDetail3(loc.replace(/^.*?chain=(\w+)(?:&.*$|#.*$|$)/, '$1'), page)
    if (loc.includes('.html')) return getUserListDetail3(loc.replace(/.+\/(\w+).html(?:\?.*|&.*$|#.*$|$)/, '$1'), page)
    return getUserListDetail(loc, page, ++retryNum)
  }

  if (typeof resp.body === 'string') {
    const global_collection_id = resp.body.match(/"global_collection_id":"(\w+)"/)?.[1]
    if (!global_collection_id) throw new Error('get list error')
    return getUserListDetail2(global_collection_id)
  }

  if (resp.body.errcode !== 0) return getUserListDetail(link, page, ++retryNum)
  throw new Error('get list error')
}

const getTags = async (tryNum = 0): Promise<any> => {
  if (tryNum > 2) return Promise.reject(new Error('try max num'))
  const { body } = await httpFetch(getInfoUrl()).promise
  if (body.status !== 1) return getTags(++tryNum)
  return {
    hotTag: filterInfoHotTag(body.data.hotTag),
    tags: filterTagInfo(body.data.tagids),
    source: 'kg',
  }
}

const getHotTags = async (tryNum = 0): Promise<any> => {
  if (tryNum > 2) return Promise.reject(new Error('try max num'))
  const { body } = await httpFetch(getInfoUrl()).promise
  if (body.status !== 1) return getHotTags(++tryNum)
  return {
    list: filterInfoHotTag(body.data.hotTag),
    source: 'kg',
  }
}

const getSongList = async (sortId: string, tagId?: string, page = 1, tryNum = 0): Promise<any[]> => {
  if (tryNum > 2) return Promise.reject(new Error('try max num'))
  const { body } = await httpFetch(getSongListUrl(sortId, tagId, page)).promise
  if (!body || body.status !== 1) return getSongList(sortId, tagId, page, ++tryNum)
  return filterList(body.special_db)
}

const getListInfo = async (tagId?: string, tryNum = 0): Promise<any> => {
  if (tryNum > 2) return Promise.reject(new Error('try max num'))
  const { body } = await httpFetch(getInfoUrl(tagId)).promise
  if (body.status !== 1) return getListInfo(tagId, ++tryNum)
  return {
    limit: body.data.params.pagesize,
    page: body.data.params.p,
    total: body.data.params.total,
    source: 'kg',
  }
}

const getListDetail = async (id: string | number, page = 1): Promise<any> => {
  let idStr = id.toString()
  if (idStr.includes('special/single/')) {
    idStr = idStr.replace(regExps.listDetailLink, '$1')
  } else if (/https?:/.test(idStr)) {
    return getUserListDetail(idStr.replace(/^.*?http/, 'http'), page)
  } else if (/^\d+$/.test(idStr)) {
    return getUserListDetailByCode(idStr)
  } else if (idStr.startsWith('id_')) {
    idStr = idStr.replace('id_', '')
  }
  return getListDetailBySpecialId(idStr, page)
}

const searchSongList = async (text: string, page = 1, limit = 20): Promise<any> => {
  const { body } = await httpFetch(`http://msearchretry.kugou.com/api/v3/search/special?keyword=${encodeURIComponent(text)}&page=${page}&pagesize=${limit}&showtype=10&filter=0&version=7910&sver=2`).promise
  if (body.errcode != 0) throw new Error('failed')
  return {
    list: body.data.info.map((item: any) => ({
      play_count: formatPlayCount(item.playcount),
      id: 'id_' + item.specialid,
      author: item.nickname,
      name: item.specialname,
      time: dateFormat(item.publishtime, 'Y-M-D'),
      img: item.imgurl,
      grade: item.grade,
      desc: item.intro,
      total: item.songcount,
      source: 'kg',
    })),
    limit,
    total: body.data.total,
    source: 'kg',
  }
}

export default {
  sortList,
  getTags,
  getHotTags,
  getListDetail,
  searchSongList,
  getDetailPageUrl(id: string | number) {
    if (typeof id === 'string') {
      if (/^https?:\/\//.test(id)) return id
      id = id.replace('id_', '')
    }
    return `https://www.kugou.com/yy/special/single/${id}.html`
  },
}
