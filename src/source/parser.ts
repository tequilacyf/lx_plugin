import type { SourceMetadata } from './types'

// Extract metadata from JSDoc header in source script
export function parseSourceScript(script: string, fallbackName?: string): {
  metadata: Partial<SourceMetadata>
  rawScript: string
} {
  const rawScript = script.trim()

  // Match JSDoc block: /** ... */ or /*! ... */ (multi-line or single-line)
  const jsdocMatch = rawScript.match(/^\/\*[!*]\s*(?:\n([\s\S]*?))?\*\//)

  const meta: Partial<SourceMetadata> = {
    name: fallbackName || 'Unknown Source',
    version: '1.0.0',
    description: '',
    author: '',
    homepage: '',
  }

  if (jsdocMatch) {
    const content = jsdocMatch[1]
    const nameMatch = content.match(/@name\s+(.+)/)
    const versionMatch = content.match(/@version\s+(.+)/)
    const descMatch = content.match(/@description\s+(.+)/)
    const authorMatch = content.match(/@author\s+(.+)/)
    const homepageMatch = content.match(/@homepage\s+(.+)/)

    if (nameMatch) meta.name = nameMatch[1].trim()
    if (versionMatch) meta.version = versionMatch[1].trim()
    if (descMatch) meta.description = descMatch[1].trim()
    if (authorMatch) meta.author = authorMatch[1].trim()
    if (homepageMatch) meta.homepage = homepageMatch[1].trim()
  }

  return { metadata: meta, rawScript }
}

// Generate a safe ID from name (slug, preserve Chinese)
export function nameToId(name: string): string {
  let id = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\u3400-\u4dbf_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!id) {
    id = 'source_' + Date.now().toString(36)
  }

  return id
}

// Deduplicate ID by appending _2, _3, etc.
export function deduplicateId(baseId: string, existingIds: Set<string>): string {
  if (!existingIds.has(baseId)) return baseId
  let counter = 2
  while (existingIds.has(`${baseId}_${counter}`)) {
    counter++
  }
  return `${baseId}_${counter}`
}
