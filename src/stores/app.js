import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'

const api = window.electronAPI || {}

export const useAppStore = defineStore('app', {
  state: () => ({
    paths: null,
    loading: false,
    message: null
  }),
  actions: {
    async init() {
      try {
        if (api && typeof api.getPaths === 'function') {
          this.paths = await api.getPaths()
        } else {
          this.paths = {
            mediaDir: '',
            dataDir: '',
            userData: ''
          }
        }
      } catch (e) {
        console.warn('获取路径失败:', e)
        this.paths = {
          mediaDir: '',
          dataDir: '',
          userData: ''
        }
      }
    },
    formatFileSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 2 : 0) + ' ' + sizes[i]
    },
    parseTags(str) {
      if (!str) return []
      try {
        const arr = JSON.parse(str)
        return Array.isArray(arr) ? arr : []
      } catch {
        return []
      }
    },
    generateFileName(ext) {
      return `${dayjs().format('YYYYMMDD_HHmmss')}_${uuidv4().slice(0, 8).toUpperCase()}.${ext}`
    }
  }
})
