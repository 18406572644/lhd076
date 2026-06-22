<template>
  <div class="mini-map-wrapper">
    <div ref="mapRef" class="map-container"></div>
    <div v-if="!hasData" class="map-empty">
      <div class="empty-icon">
        <svg viewBox="0 0 48 48" width="40" height="40">
          <circle cx="24" cy="20" r="14" fill="none" stroke="#d4d4d4" stroke-width="2"/>
          <path d="M24 10 L24 30 M14 20 L34 20" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/>
          <circle cx="24" cy="38" r="2" fill="#d4d4d4"/>
        </svg>
      </div>
      <div class="empty-title">暂无位置数据</div>
      <div class="empty-hint">为旅行或照片添加地点信息后可在此展示足迹</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  travelId: [Number, String]
})

const api = window.electronAPI

const mapRef = ref(null)
let mapInstance = null
let markersLayer = null
let pathLayer = null

const mapData = ref({ travels: [], media: [] })

const hasData = computed(() => {
  const { travels, media } = mapData.value
  return travels.some(t => t.latitude && t.longitude) ||
         media.some(m => m.latitude && m.longitude)
})

const colorList = ['#7eb8da', '#c4a77d', '#e8a5b9', '#8bc9a0', '#b59ad6', '#f2d59e']

const initMap = () => {
  if (!mapRef.value || mapInstance) return
  mapInstance = L.map(mapRef.value, {
    center: [30.5928, 114.3055],
    zoom: 4,
    scrollWheelZoom: true
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(mapInstance)
  markersLayer = L.layerGroup().addTo(mapInstance)
  pathLayer = L.layerGroup().addTo(mapInstance)
  loadData()
}

const loadData = async () => {
  const data = await api.stats.map()
  if (props.travelId) {
    const travelMedia = await api.media.getByTravel(props.travelId)
    const travelInfo = await api.travel.get(props.travelId)
    mapData.value = {
      travels: travelInfo ? [travelInfo] : [],
      media: travelMedia.filter(m => m.latitude && m.longitude)
    }
  } else {
    mapData.value = data
  }
  if (mapInstance) renderMarkers()
}

const renderMarkers = () => {
  if (!mapInstance) return
  markersLayer.clearLayers()
  pathLayer.clearLayers()
  const bounds = []

  const { travels, media } = mapData.value

  travels.forEach((t, idx) => {
    const color = colorList[idx % colorList.length]
    if (t.latitude && t.longitude) {
      bounds.push([t.latitude, t.longitude])
      const travelIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};padding:5px 10px;border-radius:14px;color:#fff;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid #fff">✈️ ${escapeHtml(t.title)}</div>`,
        iconSize: null,
        iconAnchor: [0, 0]
      })
      const marker = L.marker([t.latitude, t.longitude], { icon: travelIcon }).addTo(markersLayer)
      marker.bindPopup(`
        <div style="min-width:200px">
          <h4 style="margin:0 0 8px;color:${color}">${escapeHtml(t.title)}</h4>
          ${t.location ? `<p style="margin:0 0 6px;font-size:12px;color:#888">📍 ${escapeHtml(t.location)}</p>` : ''}
          ${t.start_date ? `<p style="margin:0;font-size:12px;color:#888">📅 ${t.start_date}${t.end_date ? ' ~ ' + t.end_date : ''}</p>` : ''}
          ${t.description ? `<p style="margin:8px 0 0;font-size:12px;color:#666;line-height:1.5">${escapeHtml(t.description.slice(0, 80))}${t.description.length > 80 ? '...' : ''}</p>` : ''}
        </div>
      `)
    }
  })

  const mediaByTravel = {}
  media.forEach(m => {
    const tid = m.travel_id || 'none'
    if (!mediaByTravel[tid]) mediaByTravel[tid] = []
    mediaByTravel[tid].push(m)
  })

  Object.entries(mediaByTravel).forEach(([tid, items]) => {
    const travelIdx = travels.findIndex(t => t.id === Number(tid))
    const c = travelIdx >= 0 ? colorList[travelIdx % colorList.length] : '#b0b0b0'
    const sorted = [...items].sort((a, b) => {
      const da = new Date(a.taken_at || a.created_at)
      const db = new Date(b.taken_at || b.created_at)
      return da - db
    })
    sorted.forEach(m => {
      if (m.latitude && m.longitude) {
        bounds.push([m.latitude, m.longitude])
        const iconHtml = m.file_type === 'video'
          ? `<div style="background:${c};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="font-size:7px;color:#fff">▶</span></div>`
          : `<div style="background:${c};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`
        const pointIcon = L.divIcon({
          className: 'point-marker',
          html: iconHtml,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        })
        const marker = L.marker([m.latitude, m.longitude], { icon: pointIcon }).addTo(markersLayer)
        const imgSrc = m.file_path ? `file:///${m.file_path.replace(/\\/g, '/')}` : ''
        marker.bindPopup(`
          <div style="min-width:180px">
            ${m.file_type === 'image' ? `<img src="${imgSrc}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block" onerror="this.style.display='none'" />` : ''}
            <p style="margin:0 0 4px;font-weight:600;font-size:12px">${escapeHtml(m.title || m.original_name || '未命名')}</p>
            ${m.taken_at ? `<p style="margin:0;font-size:11px;color:#888">📷 ${m.taken_at.slice(0, 10)}</p>` : ''}
            ${m.location ? `<p style="margin:2px 0 0;font-size:11px;color:#888">📍 ${escapeHtml(m.location)}</p>` : ''}
          </div>
        `)
      }
    })
    if (sorted.length >= 2) {
      const path = sorted.filter(m => m.latitude && m.longitude).map(m => [m.latitude, m.longitude])
      if (path.length >= 2) {
        L.polyline(path, {
          color: c,
          weight: 3,
          opacity: 0.6,
          dashArray: '8, 6'
        }).addTo(pathLayer)
      }
    }
  })

  if (bounds.length) {
    const b = L.latLngBounds(bounds)
    try { mapInstance.fitBounds(b, { padding: [40, 40] }) } catch(e) {}
  }
}

const escapeHtml = (s) => {
  if (!s) return ''
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
}

onMounted(initMap)
watch(() => props.travelId, () => { if (mapInstance) loadData() })

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style lang="less" scoped>
.mini-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #f5f7f9;
  border-radius: 12px;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

:deep(.custom-marker),
:deep(.point-marker) {
  background: transparent;
  border: none;
}

.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(250, 246, 240, 0.9);
  backdrop-filter: blur(2px);
  z-index: 500;

  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.7;
  }
  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: #8a8a8a;
    margin-bottom: 6px;
  }
  .empty-hint {
    font-size: 12px;
    color: #b0b0b0;
  }
}
</style>
