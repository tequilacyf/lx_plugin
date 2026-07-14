export const sizeFormate = (size: number): string => {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const number = Math.floor(Math.log(size) / Math.log(1024))
  return `${(size / Math.pow(1024, Math.floor(number))).toFixed(2)} ${units[number]}`
}

const numFix = (n: number): string => n < 10 ? `0${n}` : n.toString()

export const decodeName = (str: string | null | undefined): string => {
  if (!str) return ''
  const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' }
  return str.replace(/&[a-zA-Z]+;/g, match => entities[match] || match)
}

export const formatPlayTime = (time: number): string => {
  const m = Math.trunc(time / 60)
  const s = Math.trunc(time % 60)
  return m === 0 && s === 0 ? '--/--' : numFix(m) + ':' + numFix(s)
}

export const dateFormat = (_date: Date | number | string, format = 'Y-M-D h:m:s'): string => {
  const date = new Date(_date)
  if (!date || isNaN(date.getTime())) return ''
  return format.replace('Y', date.getFullYear().toString())
    .replace('M', numFix(date.getMonth() + 1))
    .replace('D', numFix(date.getDate()))
    .replace('h', numFix(date.getHours()))
    .replace('m', numFix(date.getMinutes()))
    .replace('s', numFix(date.getSeconds()))
}

export const formatPlayCount = (num: number): string => {
  if (num > 100000000) return parseInt(String(num / 10000000)) / 10 + '亿'
  if (num > 10000) return parseInt(String(num / 1000)) / 10 + '万'
  return String(num)
}

export const formatSingerName = (singers: any[], nameKey = 'name', join = '、'): string => {
  if (Array.isArray(singers)) {
    const singer: string[] = []
    singers.forEach(item => {
      const name = item[nameKey]
      if (!name) return
      singer.push(name)
    })
    return decodeName(singer.join(join))
  }
  return decodeName(String(singers ?? ''))
}
