import { defineStore } from 'pinia'

const api = window.electronAPI

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
        this.albums = await api.album.list()
        return this.albums
      } finally {
        this.loading = false
      }
    },
    async fetchAlbum(id) {
      this.currentAlbum = await api.album.get(id)
      this.currentAlbumMedia = await api.media.getByAlbum(id)
      return this.currentAlbum
    },
    async createAlbum(data) {
      const id = await api.album.create(data)
      await this.fetchAlbums()
      return id
    },
    async updateAlbum(id, data) {
      await api.album.update(id, data)
      await this.fetchAlbums()
    },
    async deleteAlbum(id) {
      await api.album.delete(id)
      await this.fetchAlbums()
    }
  }
})
