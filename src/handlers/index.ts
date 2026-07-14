import type { HTTPRequest, HTTPResponse } from '@songloft/plugin-sdk'
import { parseQuery, jsonResponse } from '@songloft/plugin-sdk'
import { handleSearch, handleSearchTopOne } from './search'
import { handleSonglistTags, handleSonglistList, handleSonglistSearch, handleSonglistDetail } from './songlist'
import { handleLeaderboardBoards, handleLeaderboardList } from './leaderboard'
import { createSourceHandlers } from './source'
import type { SourceManager } from '../source/manager'
import type { RuntimeManager } from '../engine/manager'
import { platforms, sources } from '../musicSdk'
import { errorResponse, successResponse } from './response'

export function registerRoutes(router: any, sourceManager: SourceManager, runtimeManager: RuntimeManager) {
  const sourceHandlers = createSourceHandlers(sourceManager)

  // Search
  router.post('/api/search', handleSearch)
  router.post('/api/search/topone', handleSearchTopOne)

  // Music URL resolution
  router.post('/api/music/url', async (req: HTTPRequest): Promise<HTTPResponse> => {
    try {
      const body = JSON.parse(new TextDecoder().decode(req.body || new Uint8Array(0)))
      const { source_data, quality = '320k' } = body

      if (!source_data) return errorResponse('source_data is required')

      const parsed = typeof source_data === 'string' ? JSON.parse(source_data) : source_data
      const { platform, songInfo } = parsed

      if (!platform || !songInfo) return errorResponse('Invalid source_data')

      const urlResult = await runtimeManager.getMusicUrl(platform, songInfo, quality)
      if (!urlResult) {
        return jsonResponse({ error: 'No URL available. Please import a source script.' }, 404)
      }

      return jsonResponse({ url: urlResult.url })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  })

  // Direct music URL
  router.post('/api/direct/music/url', async (req: HTTPRequest): Promise<HTTPResponse> => {
    try {
      const body = JSON.parse(new TextDecoder().decode(req.body || new Uint8Array(0)))
      const { songInfo, quality = '320k' } = body

      if (!songInfo || !songInfo.source) return errorResponse('songInfo with source is required')

      const urlResult = await runtimeManager.getMusicUrl(songInfo.source, songInfo, quality)
      if (!urlResult) return errorResponse('No URL available', 404)

      return jsonResponse({ url: urlResult.url })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  })

  // Direct lyric
  router.get('/api/direct/lyric', async (req: HTTPRequest): Promise<HTTPResponse> => {
    try {
      const q = parseQuery(req.query)
      const sourceId = q.source_id || q.source
      const songmid = q.songmid || q.id

      if (!sourceId || !songmid) return errorResponse('source_id and songmid are required')

      const sdk = platforms[sourceId]
      if (!sdk) return errorResponse(`Source ${sourceId} not found`)

      const songInfo = { songmid, source: sourceId }
      const result = await sdk.getLyric(songInfo)
      return jsonResponse({ code: 0, data: { lyric: result?.lyric || '' } })
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  })

  // Song import to library
  router.post('/api/songs/import', async (req: HTTPRequest): Promise<HTTPResponse> => {
    try {
      const body = JSON.parse(new TextDecoder().decode(req.body || new Uint8Array(0)))
      const { songs, playlist_id } = body

      if (!songs || !Array.isArray(songs) || songs.length === 0) {
        return errorResponse('songs array is required')
      }

      const hostUrl = await songloft.plugin.getHostUrl()
      const token = await songloft.plugin.getToken()
      const authHeaders = { Authorization: `Bearer ${token}` }

      const results: any[] = []

      for (const song of songs) {
        try {
          const sourceData = typeof song.source_data === 'string' ? JSON.parse(song.source_data) : song.source_data
          const { platform, songInfo } = sourceData

          const stableId = songInfo.songmid || songInfo.musicId || songInfo.hash || songInfo.copyrightId || ''
          const dedupKey = stableId ? `${platform}:${stableId}` : ''

          let lyricUrl = ''
          let lyricSource = ''
          let lyricText = ''

          try {
            const sdk = platforms[platform]
            if (sdk && sdk.getLyric) {
              const lyricResult = await sdk.getLyric(songInfo)
              if (lyricResult && lyricResult.lyric) {
                lyricText = lyricResult.lyric
                lyricSource = 'inline'
              }
            }
          } catch (_e) {
            const directLyricUrl = `${hostUrl}/api/v1/jsplugin/lxmusic/api/direct/lyric?source_id=${platform}&songmid=${encodeURIComponent(songInfo.songmid || '')}`
            lyricUrl = directLyricUrl
            lyricSource = 'url'
          }

          const importBody: any = {
            title: song.title || songInfo.name,
            artist: song.artist || songInfo.singer,
            album: song.album || songInfo.albumName || '',
            cover_url: song.cover_url || songInfo.img || null,
            duration: song.duration || 0,
            plugin_entry_path: 'lxmusic',
            source_data: JSON.stringify(sourceData),
            dedup_key: dedupKey,
          }

          if (lyricSource === 'url') {
            importBody.lyric_source = 'url'
            importBody.lyric = lyricUrl
          } else if (lyricSource === 'inline') {
            importBody.lyric = lyricText
          }

          const resp = await fetch(`${hostUrl}/api/v1/songs/remote`, {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(importBody),
          })

          const result = await resp.json()
          results.push({ success: resp.ok, data: result, title: importBody.title })

          if (playlist_id && resp.ok && result?.data?.id) {
            try {
              await fetch(`${hostUrl}/api/v1/playlists/${playlist_id}/songs`, {
                method: 'POST',
                headers: {
                  ...authHeaders,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ song_id: result.data.id }),
              })
            } catch (_e) {
              // ignore
            }
          }
        } catch (err: any) {
          results.push({ success: false, error: err.message, title: song.title })
        }
      }

      return successResponse(results)
    } catch (err: any) {
      return errorResponse(err.message || String(err), 500)
    }
  })

  // Source management
  router.get('/api/sources', sourceHandlers.handleGetSources)
  router.post('/api/sources/import', sourceHandlers.handleImportSource)
  router.post('/api/sources/import-url', sourceHandlers.handleImportUrl)
  router.delete('/api/sources', sourceHandlers.handleDeleteSource)
  router.put('/api/sources/toggle', sourceHandlers.handleToggleSource)

  // Songlist
  router.get('/api/songlist/tags', handleSonglistTags)
  router.get('/api/songlist/list', handleSonglistList)
  router.get('/api/songlist/search', handleSonglistSearch)
  router.get('/api/songlist/detail', handleSonglistDetail)

  // Leaderboard
  router.get('/api/leaderboard/boards', handleLeaderboardBoards)
  router.get('/api/leaderboard/list', handleLeaderboardList)

  // Platform list
  router.get('/api/platforms', (_req: HTTPRequest) => {
    return jsonResponse({ sources })
  })

  // Health check
  router.get('/api/health', (_req: HTTPRequest) => {
    return jsonResponse({ status: 'ok', timestamp: Date.now() })
  })
}
