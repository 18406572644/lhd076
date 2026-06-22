import { defineStore } from 'pinia'

const api = window.electronAPI

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
        this.mediaList = await api.media.list(filters)
        return this.mediaList
      } finally {
        this.loading = false
      }
    },
    async fetchMediaByAlbum(albumId) {
      this.mediaList = await api.media.getByAlbum(albumId)
      return this.mediaList
    },
    async fetchMediaByTravel(travelId) {
      this.mediaList = await api.media.getByTravel(travelId)
      return this.mediaList
    },
    async createMedia(data) {
      return await api.media.create(data)
    },
    async bulkCreateMedia(items) {
      return await api.media.bulkCreate(items)
    },
    async updateMedia(id, data) {
      await api.media.update(id, data)
    },
    async bulkUpdateMedia(ids, data) {
      await api.media.bulkUpdate(ids, data)
    },
    async deleteMedia(id) {
      await api.media.delete(id)
      this.mediaList = this.mediaList.filter(m => m.id !== id)
    },
    async addToAlbum(mediaId, albumId) {
      await api.media.addToAlbum(mediaId, albumId)
    },
    async removeFromAlbum(mediaId, albumId) {
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
