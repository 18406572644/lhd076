import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

export const formatDateTime = (date) => formatDate(date, 'YYYY-MM-DD HH:mm:ss')

export const formatTime = (date) => formatDate(date, 'HH:mm')

export const fromNow = (date) => {
  if (!date) return '-'
  return dayjs(date).fromNow()
}

export const formatDuration = (seconds) => {
  if (!seconds) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const getDateRange = (start, end) => {
  if (!start || !end) return 1
  return dayjs(end).diff(dayjs(start), 'day') + 1
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return size.toFixed(i > 0 ? 2 : 0) + ' ' + units[i]
}

export const getFileExt = (filename) => {
  return filename.split('.').pop().toLowerCase()
}

export const isImage = (ext) => {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff'].includes(ext.toLowerCase())
}

export const isVideo = (ext) => {
  return ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'webm'].includes(ext.toLowerCase())
}

export const getFileType = (filename) => {
  const ext = getFileExt(filename)
  if (isImage(ext)) return 'image'
  if (isVideo(ext)) return 'video'
  return 'other'
}

export const parseTags = (str) => {
  if (!str) return []
  try {
    const arr = JSON.parse(str)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export const debounce = (fn, delay = 300) => {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export const throttle = (fn, delay = 300) => {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn(...args)
    }
  }
}

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const groupByDate = (list, dateField = 'taken_at') => {
  const groups = {}
  for (const item of list) {
    const date = formatDate(item[dateField] || item.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export const groupByMonth = (list, dateField = 'taken_at') => {
  const groups = {}
  for (const item of list) {
    const month = formatDate(item[dateField] || item.created_at, 'YYYY-MM')
    if (!groups[month]) groups[month] = []
    groups[month].push(item)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export { dayjs }
