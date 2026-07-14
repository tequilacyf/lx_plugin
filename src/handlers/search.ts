import { platforms, sources } from '../musicSdk'
import type { HTTPRequest, HTTPResponse, SearchResultItem } from '@songloft/plugin-sdk'
import { jsonResponse } from '@songloft/plugin-sdk'
import type { MusicSearchItem } from '../types'
import { errorResponse } from './response'

interface SearchBody {
  keyword: string
  source_id?: string
  quality?: string
  page?: number
  page_size?: number
}

function songInfoToSourceData(platform: string, item: MusicSearchItem, quality: string): Record<string, unknown> {
  return {
    platform,
    quality,
    songInfo: {
      name: item.name,
      singer: item.singer,
      songmid: item.songmid,
      albumId: item.albumId || '',
      albumName: item.albumName || '',
      hash: item.hash || '',
      copyrightId: (item as any).copyrightId || '',
      strMediaMid: (item as any).strMediaMid || '',
      albumMid: (item as any).albumMid || '',
      source: platform,
    },
  }
}

function itemToSearchResult(platform: string, item: MusicSearchItem, quality: string): SearchResultItem {
  return {
    title: item.name,
    artist: item.singer,
    album: item.albumName || '',
    duration: parseInterval(item.interval),
    cover_url: item.img || undefined,
    source_data: songInfoToSourceData(platform, item, quality),
  }
}

function parseInterval(interval: string): number {
  if (!interval || interval === '--/--') return 0
  const parts = interval.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  return 0
}

export async function handleSearch(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const body: SearchBody = JSON.parse(new TextDecoder().decode(req.body || new Uint8Array(0)))
    const { keyword, source_id, quality = '320k', page = 1, page_size = 30 } = body

    if (!keyword || !keyword.trim()) {
      return errorResponse('keyword is required')
    }

    const platformsToSearch = source_id ? [source_id] : sources.map(s => s.id)
    const allResults: SearchResultItem[] = []

    const searchTasks = platformsToSearch
      .filter(pid => platforms[pid])
      .map(async (pid) => {
        try {
          const sdk = platforms[pid]
          if (!sdk.musicSearch) return []
          const result = await sdk.musicSearch.search(keyword.trim(), page, page_size)
          if (!result || !result.list) return []
          return result.list.map((item: MusicSearchItem) => itemToSearchResult(pid, item, quality))
        } catch (err) {
          songloft.log.warn(`[Search] Error searching ${pid}`)
          return []
        }
      })

    const results = await Promise.all(searchTasks)
    for (const r of results) allResults.push(...r)

    return jsonResponse({ results: allResults })
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}

export async function handleSearchTopOne(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const body = JSON.parse(new TextDecoder().decode(req.body || new Uint8Array(0)))
    const { keyword, source_id, quality = '320k' } = body

    if (!keyword) return errorResponse('keyword is required')

    const searchResult = await handleSearch({
      ...req,
      body: new TextEncoder().encode(JSON.stringify({
        keyword,
        source_id,
        quality,
        page: 1,
        page_size: 5,
      })),
    })

    const searchData = JSON.parse(searchResult.body as string)
    if (!searchData.results || searchData.results.length === 0) {
      return errorResponse('No results found')
    }

    return jsonResponse({ results: searchData.results.slice(0, 1) })
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}
