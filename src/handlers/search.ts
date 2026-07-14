import { platforms, sources } from '../musicSdk'
import type { HTTPRequest, HTTPResponse, SearchResultItem } from '@songloft/plugin-sdk'
import { jsonResponse, parseQuery } from '@songloft/plugin-sdk'
import type { MusicSearchItem } from '../types'
import { errorResponse, decodeBody } from './response'

interface SearchBody {
  keyword: string
  source_id?: string
  quality?: string
  page?: number
  page_size?: number
}

function parseSearchBody(req: HTTPRequest): SearchBody {
  // Try query params first (GET) to avoid host hex-decode POST body issue
  const q = parseQuery(req.query)
  const out: SearchBody = { keyword: '' }
  if (q.keyword) {
    out.keyword = q.keyword
    if (q.source_id) out.source_id = q.source_id
    if (q.quality) out.quality = q.quality
    if (q.page) out.page = parseInt(q.page) || 1
    if (q.page_size) out.page_size = parseInt(q.page_size) || 30
    return out
  }
  // Fallback to POST body
  const raw = decodeBody(req)
  if (raw) {
    try { return JSON.parse(raw) } catch {}
  }
  return out
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

export function createSearchHandlers(runtimeManager: any) {
  async function handleSearch(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const body = parseSearchBody(req)
      const { keyword, source_id, quality = '320k', page = 1, page_size = 30 } = body

      if (!keyword || !keyword.trim()) {
        return errorResponse('keyword is required')
      }

      const platformsToSearch = source_id ? [source_id] : sources.map(s => s.id)
      const allResults: SearchResultItem[] = []

      const searchTasks = platformsToSearch
        .filter(pid => platforms[pid] || runtimeManager.hasPlatform(pid))
        .map(async (pid) => {
          try {
            // Try source script search first
            if (runtimeManager.hasPlatform(pid)) {
              const srcItems = await runtimeManager.search(pid, keyword.trim(), page, page_size)
              if (srcItems && srcItems.length > 0) {
                return srcItems.map((item: any) => sourceItemToResult(pid, item, quality))
              }
            }
            // Fallback to built-in SDK
            const sdk = platforms[pid]
            if (!sdk?.musicSearch) return []
            const result = await sdk.musicSearch.search(keyword.trim(), page, page_size)
            if (!result || !result.list) return []
            return result.list.map((item: MusicSearchItem) => itemToSearchResult(pid, item, quality))
          } catch (err: any) {
            songloft.log.warn(`[Search] Error searching ${pid}: ${err?.message || err}`)
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

  function sourceItemToResult(platform: string, item: any, quality: string): SearchResultItem {
    const info = {
      name: item.name || item.title || '',
      singer: item.singer || item.artist || '',
      songmid: item.songmid || item.id || item.musicId || '',
      albumId: item.albumId || (item.album ? item.album.id : '') || '',
      albumName: item.albumName || item.album || '',
      hash: item.hash || '',
      copyrightId: item.copyrightId || '',
      strMediaMid: item.strMediaMid || '',
      albumMid: item.albumMid || '',
      source: platform,
    }
    return {
      title: info.name,
      artist: info.singer,
      album: info.albumName,
      duration: typeof item.duration === 'number' ? item.duration
        : typeof item.interval === 'number' ? item.interval
        : parseInterval(item.interval || item.durationText || '') || 0,
      cover_url: item.img || item.cover || item.cover_url || undefined,
      source_data: { platform, quality, songInfo: info },
    }
  }

  async function handleSearchTopOne(req: HTTPRequest): Promise<HTTPResponse> {
    try {
      const body = parseSearchBody(req)
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

  return { handleSearch, handleSearchTopOne }
}

// Re-export for non-runtime-manager fallback (songlist.ts / fallbackSearch still uses old SDK)
export { createSearchHandlers as createSearchHandlersType }
