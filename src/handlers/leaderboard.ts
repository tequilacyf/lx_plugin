import { platforms } from '../musicSdk'
import type { HTTPRequest, HTTPResponse } from '@songloft/plugin-sdk'
import { parseQuery } from '@songloft/plugin-sdk'
import { errorResponse, successResponse } from './response'

export async function handleLeaderboardBoards(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const q = parseQuery(req.query)
    const sourceId = q.source_id || 'kw'
    const sdk = platforms[sourceId]
    if (!sdk || !sdk.leaderboard) return errorResponse(`Source ${sourceId} not found`)

    // Call getBoards() method - all platforms export this as a method
    const boards = await sdk.leaderboard.getBoards()
    // Normalize: some return {source, list}, others return just the list
    const list = Array.isArray(boards) ? boards : (boards?.list || boards || [])
    return successResponse({ source: sourceId, list })
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}

export async function handleLeaderboardList(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const q = parseQuery(req.query)
    const sourceId = q.source_id || 'kw'
    const id = q.id
    const page = parseInt(q.page || '1')
    const limit = parseInt(q.limit || '30')

    if (!id) return errorResponse('id is required')

    const sdk = platforms[sourceId]
    if (!sdk || !sdk.leaderboard) return errorResponse(`Source ${sourceId} not found`)

    // Platform method naming: kw/kg use getList, tx/wy/mg use getBoardDetail
    let result
    if (typeof sdk.leaderboard.getList === 'function') {
      result = await sdk.leaderboard.getList(id, page, limit)
    } else if (typeof sdk.leaderboard.getBoardDetail === 'function') {
      result = await sdk.leaderboard.getBoardDetail(id, page, limit)
    } else {
      return errorResponse(`Source ${sourceId} has no leaderboard list method`)
    }

    return successResponse(result)
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}
