import { defineStore } from 'pinia'

const api = window.electronAPI || {}

export const useMediaStore = defineStore('media', {
  state: () => ({
    mediaList: [],
    selectedIds: [],
    currentMedia: null,
    loading: false
  }),
  getters: {
    selectedMedia: (state) => state.mediaList.filter(m => state.selectedIds.includes(m.id))
  },
  actions: {
    async fetchMedia(filters = {}) {
      this.loading = true
      try {
        if (api.media && typeof api.media.list === 'function') {
          this.mediaList = await api.media.list(filters) || []
        } else {
          this.mediaList = []
        }
        return this.mediaList
      } catch (e) {
        console.warn('获取媒体列表失败:', e)
        this.mediaList = []
        return []
      } finally {
        this.loading = false
      }
    },
    async fetchMediaByAlbum(albumId) {
      try {
        if (api.media && typeof api.media.getByAlbum === 'function') {
          this.mediaList = await api.media.getByAlbum(albumId) || []
        } else {
          this.mediaList = []
        }
        return this.mediaList
      } catch (e) {
        console.warn('获取相册媒体失败:', e)
        this.mediaList = []
        return []
      }
    },
    async fetchMediaByTravel(travelId) {
      try {
        if (api.media && typeof api.media.getByTravel === 'function') {
          this.mediaList = await api.media.getByTravel(travelId) || []
        } else {
          this.mediaList = []
        }
        return this.mediaList
      } catch (e) {
        console.warn('获取旅行媒体失败:', e)
        this.mediaList = []
        return []
      }
    },
    async createMedia(data) {
      if (!api.media || typeof api.media.create !== 'function') {
        throw new Error('创建媒体功能不可用')
      }
      return await api.media.create(data)
    },
    async bulkCreateMedia(items) {
      if (!api.media || typeof api.media.bulkCreate !== 'function') {
        throw new Error('批量创建媒体功能不可用')
      }
      return await api.media.bulkCreate(items)
    },
    async updateMedia(id, data) {
      if (!api.media || typeof api.media.update !== 'function') {
        throw new Error('更新媒体功能不可用')
      }
      await api.media.update(id, data)
    },
    async bulkUpdateMedia(ids, data) {
      if (!api.media || typeof api.media.bulkUpdate !== 'function') {
        throw new Error('批量更新媒体功能不可用')
      }
      await api.media.bulkUpdate(ids, data)
    },
    async deleteMedia(id) {
      if (!api.media || typeof api.media.delete !== 'function') {
        throw new Error('删除媒体功能不可用')
      }
      await api.media.delete(id)
      this.mediaList = this.mediaList.filter(m => m.id !== id)
    },
    async addToAlbum(mediaId, albumId) {
      if (!api.media || typeof api.media.addToAlbum !== 'function') {
        throw new Error('添加到相册功能不可用')
      }
      await api.media.addToAlbum(mediaId, albumId)
    },
    async removeFromAlbum(mediaId, albumId) {
      if (!api.media || typeof api.media.removeFromAlbum !== 'function') {
        throw new Error('从相册移除功能不可用')
      }
      await api.media.removeFromAlbum(mediaId, albumId)
    },
    setSelected(ids) {
      this.selectedIds = ids
    },
    clearSelection() {
      this.selectedIds = []
    }
  }
})
