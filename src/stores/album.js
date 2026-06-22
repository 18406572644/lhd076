import { defineStore } from 'pinia'

const api = window.electronAPI || {}

export const useAlbumStore = defineStore('album', {
  state: () => ({
    albums: [],
    currentAlbum: null,
    currentAlbumMedia: [],
    loading: false
  }),
  actions: {
    async fetchAlbums() {
      this.loading = true
      try {
        if (api.album && typeof api.album.list === 'function') {
          this.albums = await api.album.list() || []
        } else {
          this.albums = []
        }
        return this.albums
      } catch (e) {
        console.warn('获取相册列表失败:', e)
        this.albums = []
        return []
      } finally {
        this.loading = false
      }
    },
    async fetchAlbum(id) {
      try {
        if (api.album && typeof api.album.get === 'function') {
          this.currentAlbum = await api.album.get(id)
        } else {
          this.currentAlbum = null
        }
        if (api.media && typeof api.media.getByAlbum === 'function') {
          this.currentAlbumMedia = await api.media.getByAlbum(id) || []
        } else {
          this.currentAlbumMedia = []
        }
        return this.currentAlbum
      } catch (e) {
        console.warn('获取相册详情失败:', e)
        this.currentAlbum = null
        this.currentAlbumMedia = []
        return null
      }
    },
    async createAlbum(data) {
      if (!api.album || typeof api.album.create !== 'function') {
        throw new Error('创建相册功能不可用')
      }
      const id = await api.album.create(data)
      await this.fetchAlbums()
      return id
    },
    async updateAlbum(id, data) {
      if (!api.album || typeof api.album.update !== 'function') {
        throw new Error('更新相册功能不可用')
      }
      await api.album.update(id, data)
      await this.fetchAlbums()
    },
    async deleteAlbum(id) {
      if (!api.album || typeof api.album.delete !== 'function') {
        throw new Error('删除相册功能不可用')
      }
      await api.album.delete(id)
      await this.fetchAlbums()
    }
  }
})
