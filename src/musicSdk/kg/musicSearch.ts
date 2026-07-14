import { httpFetch } from '../request'
import { decodeName, formatPlayTime, sizeFormate } from '../utils'
import { formatSingerName } from '../utils'

export interface KgSearchResult {
  list: any[]
  allPage: number
  limit: number
  total: number
  source: string
}

const limit = 30

const musicSearch = (str: string, page: number, lim: number): Promise<any> => {
  const searchRequest = httpFetch(`https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(str)}&page=${page}&pagesize=${lim}&userid=0&clientver=&platform=WebFilter&filter=2&iscorrection=1&privilege_filter=0&area_code=1`)
  return searchRequest.promise.then(({ body }: any) => body)
}

const filterData = (rawData: any): any => {
  const types: any[] = []
  const _types: Record<string, any> = {}

  if (rawData.FileSize !== 0) {
    const size = sizeFormate(rawData.FileSize)
    types.push({ type: '128k', size, hash: rawData.FileHash })
    _types['128k'] = { size, hash: rawData.FileHash }
  }
  if (rawData.HQFileSize !== 0) {
    const size = sizeFormate(rawData.HQFileSize)
    types.push({ type: '320k', size, hash: rawData.HQFileHash })
    _types['320k'] = { size, hash: rawData.HQFileHash }
  }
  if (rawData.SQFileSize !== 0) {
    const size = sizeFormate(rawData.SQFileSize)
    types.push({ type: 'flac', size, hash: rawData.SQFileHash })
    _types.flac = { size, hash: rawData.SQFileHash }
  }
  if (rawData.ResFileSize !== 0) {
    const size = sizeFormate(rawData.ResFileSize)
    types.push({ type: 'flac24bit', size, hash: rawData.ResFileHash })
    _types.flac24bit = { size, hash: rawData.ResFileHash }
  }

  return {
    singer: decodeName(formatSingerName(rawData.Singers, 'name')),
    name: decodeName(rawData.SongName),
    albumName: decodeName(rawData.AlbumName),
    albumId: rawData.AlbumID,
    songmid: rawData.Audioid,
    source: 'kg',
    interval: formatPlayTime(rawData.Duration),
    _interval: rawData.Duration,
    img: rawData.Image ? rawData.Image.replace('{size}', '240') : (rawData.trans_param?.union_cover?.replace('{size}', '240') || null),
    lrc: null,
    otherSource: null,
    hash: rawData.FileHash,
    types,
    _types,
    typeUrl: {},
  }
}

const handleResult = (rawData: any[]): any[] => {
  const ids = new Set<string>()
  const list: any[] = []
  rawData.forEach(item => {
    const key = item.Audioid + item.FileHash
    if (ids.has(key)) return
    ids.add(key)
    list.push(filterData(item))
    for (const childItem of (item.Grp || [])) {
      const childKey = childItem.Audioid + childItem.FileHash
      if (ids.has(childKey)) continue
      ids.add(childKey)
      list.push(filterData(childItem))
    }
  })
  return list
}

const search = (str: string, page = 1, lim?: number, retryNum = 0): Promise<KgSearchResult> => {
  if (++retryNum > 3) return Promise.reject(new Error('try max num'))
  const pageSize = lim || limit
  return musicSearch(str, page, pageSize).then((result: any) => {
    if (!result || result.error_code !== 0) return search(str, page, pageSize, retryNum)

    const list = handleResult(result.data.lists)
    if (list == null) return search(str, page, pageSize, retryNum)

    const total = result.data.total
    const allPage = Math.ceil(total / pageSize)

    return {
      list,
      allPage,
      limit: pageSize,
      total,
      source: 'kg',
    }
  })
}

export default { search }
