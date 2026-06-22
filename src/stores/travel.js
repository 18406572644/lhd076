import { defineStore } from 'pinia'

const api = window.electronAPI

export const useTravelStore = defineStore('travel', {
  state: () => ({
    travels: [],
    currentTravel: null,
    loading: false
  }),
  actions: {
    async fetchTravels() {
      this.loading = true
      try {
        this.travels = await api.travel.list()
        return this.travels
      } finally {
        this.loading = false
      }
    },
    async fetchTravel(id) {
      this.currentTravel = await api.travel.get(id)
      return this.currentTravel
    },
    async createTravel(data) {
      const id = await api.travel.create(data)
      await this.fetchTravels()
      return id
    },
    async updateTravel(id, data) {
      await api.travel.update(id, data)
      await this.fetchTravels()
      if (this.currentTravel?.id === id) {
        await this.fetchTravel(id)
      }
    },
    async deleteTravel(id) {
      await api.travel.delete(id)
      await this.fetchTravels()
    }
  }
})
