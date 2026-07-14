import { platforms } from '../musicSdk'
import type { HTTPRequest, HTTPResponse } from '@songloft/plugin-sdk'
import { parseQuery } from '@songloft/plugin-sdk'
import { errorResponse, successResponse } from './response'

export async function handleSonglistTags(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const q = parseQuery(req.query)
    const sourceId = q.source_id || 'kw'
    const sdk = platforms[sourceId]
    if (!sdk || !sdk.songList) return errorResponse(`Source ${sourceId} not found`)

    const tags = await sdk.songList.getTags()
    return successResponse(tags)
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}

export async function handleSonglistList(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const q = parseQuery(req.query)
    const sourceId = q.source_id || 'kw'
    const id = q.id
    const tagId = q.tag_id || ''
    const page = parseInt(q.page || '1')
    const limit = parseInt(q.limit || '30')

    if (!id) return errorResponse('id is required')

    const sdk = platforms[sourceId]
    if (!sdk || !sdk.songList) return errorResponse(`Source ${sourceId} not found`)

    // kw getListDetail(id, tagId, page, limit) has 4 params; others have 3
    let result
    if (sourceId === 'kw' && tagId) {
      result = await sdk.songList.getListDetail(id, tagId, page, limit)
    } else {
      result = await sdk.songList.getListDetail(id, page, limit)
    }
    return successResponse(result)
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}

export async function handleSonglistSearch(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const q = parseQuery(req.query)
    const sourceId = q.source_id || 'kw'
    const keyword = q.keyword
    const page = parseInt(q.page || '1')
    const limit = parseInt(q.limit || '30')

    if (!keyword) return errorResponse('keyword is required')

    const sdk = platforms[sourceId]
    if (!sdk || !sdk.songList) return errorResponse(`Source ${sourceId} not found`)

    const result = await sdk.songList.searchSongList(keyword, page, limit)
    return successResponse(result)
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}

export async function handleSonglistDetail(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const q = parseQuery(req.query)
    const sourceId = q.source_id || 'kw'
    const id = q.id
    const tagId = q.tag_id || ''
    const page = parseInt(q.page || '1')
    const limit = parseInt(q.limit || '30')

    if (!id) return errorResponse('id is required')

    const sdk = platforms[sourceId]
    if (!sdk || !sdk.songList) return errorResponse(`Source ${sourceId} not found`)

    // kw getListDetail(id, tagId, page, limit) has 4 params; others have 3
    let result
    if (sourceId === 'kw' && tagId) {
      result = await sdk.songList.getListDetail(id, tagId, page, limit)
    } else {
      result = await sdk.songList.getListDetail(id, page, limit)
    }
    return successResponse(result)
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}

export async function handleSonglistSorts(req: HTTPRequest): Promise<HTTPResponse> {
  try {
    const q = parseQuery(req.query)
    const sourceId = q.source_id || 'kw'
    const sdk = platforms[sourceId]
    if (!sdk || !sdk.songList) return errorResponse(`Source ${sourceId} not found`)

    // kg has sortList exported; others don't have sorts
    const sorts = sdk.songList.sortList || []
    return successResponse({ source: sourceId, sorts })
  } catch (err: any) {
    return errorResponse(err.message || String(err), 500)
  }
}
