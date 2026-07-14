// Re-export SDK types that we use
export type { HTTPRequest, HTTPResponse, SearchResultItem, MusicUrlFallbackHint, FallbackMatch } from '@songloft/plugin-sdk'

// Internal musicSdk types (not from SDK)
export interface MusicSearchResult {
  list: MusicSearchItem[]
  allPage: number
  total: number
  limit: number
  source: string
}

export interface MusicSearchItem {
  name: string
  singer: string
  source: string
  songmid: string
  albumId?: string
  albumName?: string
  albumMid?: string
  interval: string
  _interval?: number
  img: string | null
  lrc: string | null
  otherSource: unknown | null
  types: QualityType[]
  _types: Record<string, unknown>
  typeUrl: Record<string, string>
  hash?: string
  copyrightId?: string
  songId?: number
  strMediaMid?: string
}

export interface QualityType {
  type: string
  size: string | null
  hash?: string
}

export interface LyricResult {
  lyric: string
  tlyric?: string
  rlyric?: string
  yrc?: string
}

export interface SongListTags {
  source: string
  tags: SongListTag[]
}

export interface SongListTag {
  id: string
  name: string
  children?: SongListTag[]
}

export interface SongListDetail {
  list: MusicSearchItem[]
  info: {
    name: string
    img: string | null
    total: number
    id: string
  }
}

export interface LeaderboardBoard {
  id: string
  name: string
  img?: string
  desc?: string
}

export interface LeaderboardList {
  source: string
  list: LeaderboardBoard[]
}

export interface LeaderboardDetail {
  list: MusicSearchItem[]
  info: {
    name: string
    img: string | null
    total: number
  }
}

export interface MusicUrlResult {
  url: string
  headers?: Record<string, string>
}
