import { defineStore } from 'pinia'

const api = window.electronAPI || {}

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
        if (api.travel && typeof api.travel.list === 'function') {
          this.travels = await api.travel.list() || []
        } else {
          this.travels = []
        }
        return this.travels
      } catch (e) {
        console.warn('获取旅行列表失败:', e)
        this.travels = []
        return []
      } finally {
        this.loading = false
      }
    },
    async fetchTravel(id) {
      try {
        if (api.travel && typeof api.travel.get === 'function') {
          this.currentTravel = await api.travel.get(id)
          return this.currentTravel
        }
        return null
      } catch (e) {
        console.warn('获取旅行详情失败:', e)
        return null
      }
    },
    async createTravel(data) {
      if (!api.travel || typeof api.travel.create !== 'function') {
        throw new Error('创建旅行功能不可用')
      }
      const id = await api.travel.create(data)
      await this.fetchTravels()
      return id
    },
    async updateTravel(id, data) {
      if (!api.travel || typeof api.travel.update !== 'function') {
        throw new Error('更新旅行功能不可用')
      }
      await api.travel.update(id, data)
      await this.fetchTravels()
      if (this.currentTravel && this.currentTravel.id === id) {
        await this.fetchTravel(id)
      }
    },
    async deleteTravel(id) {
      if (!api.travel || typeof api.travel.delete !== 'function') {
        throw new Error('删除旅行功能不可用')
      }
      await api.travel.delete(id)
      await this.fetchTravels()
    }
  }
})
