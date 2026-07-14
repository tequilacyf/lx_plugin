export interface SourceMetadata {
  id: string
  name: string
  version?: string
  description?: string
  author?: string
  homepage?: string
  enabled: boolean
  loaded: boolean
  loading: boolean
  error?: string
  scriptSize: number
  createdAt: number
  updatedAt: number
}

export interface SourceIndex {
  [id: string]: SourceMetadata
}

export interface SourceImportResult {
  success: boolean
  id?: string
  name?: string
  error?: string
  warning?: string
}

export interface BatchImportStatus {
  loading: boolean
  batch_current_id: string | null
  batch_pending_ids: string[]
  batch_total: number
  batch_completed: number
  batch_errors: Array<{ id: string; error: string }>
}
