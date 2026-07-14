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

    const boards = sdk.leaderboard.boardList || []
    return successResponse({ source: sourceId, list: boards })
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

    const result = await sdk.leaderboard.getList(id, page, limit)
    return successResponse(result)
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}
