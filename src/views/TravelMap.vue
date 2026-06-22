<template>
  <div class="page-container map-page">
    <div class="page-header">
      <h2 class="section-title">旅行足迹地图</h2>
      <div class="header-actions">
        <a-tag color="blue">📸 {{ mapData.media.length }} 张带位置照片</a-tag>
        <a-tag color="orange">✈️ {{ mapData.travels.length }} 次地点旅行</a-tag>
        <a-button size="small" @click="fitBounds" :icon="iconFullscreen">适配视图</a-button>
      </div>
    </div>

    <div class="map-wrapper">
      <div ref="mapRef" class="leaflet-map"></div>
      <div v-if="!hasData" class="map-overlay">
        <div class="overlay-card">
          <div class="oc-icon">
            <svg viewBox="0 0 64 64" width="56" height="56">
              <circle cx="32" cy="26" r="18" fill="none" stroke="#d4d4d4" stroke-width="2.5"/>
              <path d="M32 12 L32 40 M18 26 L46 26" stroke="#d4d4d4" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="32" cy="50" r="3" fill="#d4d4d4"/>
            </svg>
          </div>
          <h3>暂无地图数据</h3>
          <p>为你的旅行或照片添加地点信息<br/>即可在地图上展示旅行足迹</p>
        </div>
      </div>
    </div>

    <div class="map-legend" v-if="legendData.length">
      <div class="legend-title">
        <icon-info :size="14" /> 图例 · 旅行路线
      </div>
      <div class="legend-list">
        <div v-for="(item, idx) in legendData" :key="idx" class="legend-item">
          <span class="lg-dot" :style="{ background: item.color }"></span>
          <span class="lg-name">{{ item.name }}</span>
          <span class="lg-count">{{ item.count }} 个点</span>
        </div>
      </div>
    </div>

    <a-card class="locations-card" :bordered="false" title="所有带位置信息的旅行" v-if="mapData.travels.length">
      <a-table :data="mapData.travels" :pagination="false" size="small">
        <template #columns>
          <a-table-column title="旅行" data-index="title">
            <template #cell="{ record }">
              <span class="travel-name-cell" @click="goTravel(record.id)">{{ record.title }}</span>
            </template>
          </a-table-column>
          <a-table-column title="地点" data-index="location" />
          <a-table-column title="日期">
            <template #cell="{ record }">
              {{ record.start_date || '-' }} ~ {{ record.end_date || record.start_date || '-' }}
            </template>
          </a-table-column>
          <a-table-column title="坐标" data-index="latitude" :width="180">
            <template #cell="{ record }">
              {{ record.latitude?.toFixed(4) }}, {{ record.longitude?.toFixed(4) }}
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IconFullscreen, IconInfo } from '@arco-design/web-vue/es/icon'

const router = useRouter()
const api = window.electronAPI
const iconFullscreen = IconFullscreen
const iconInfo = IconInfo

const mapRef = ref(null)
let mapInstance = null
let markersLayer = null
let pathLayer = null
let travelLayer = null

const mapData = ref({ travels: [], media: [] })

const colorList = ['#7eb8da', '#c4a77d', '#e8a5b9', '#8bc9a0', '#b59ad6', '#f2d59e', '#f3a683']

const hasData = computed(() => {
  const { travels, media } = mapData.value
  return travels.some(t => t.latitude && t.longitude) ||
         media.some(m => m.latitude && m.longitude)
})

const legendData = computed(() => {
  const { travels, media } = mapData.value
  const items = []
  const mediaByTravel = {}
  media.forEach(m => {
    const tid = m.travel_id || 'none'
    if (!mediaByTravel[tid]) mediaByTravel[tid] = []
    if (m.latitude && m.longitude) mediaByTravel[tid].push(m)
  })
  travels.forEach((t, idx) => {
    const related = mediaByTravel[t.id] || []
    const count = related.length + (t.latitude ? 1 : 0)
    if (count > 0) {
      items.push({
        name: t.title,
        count,
        color: colorList[idx % colorList.length]
      })
    }
  })
  const uncategorized = mediaByTravel['none']?.length || 0
  if (uncategorized > 0) {
    items.push({ name: '未分类', count: uncategorized, color: '#b0b0b0' })
  }
  return items
})

const initMap = () => {
  if (!mapRef.value || mapInstance) return
  const L = window.L
  if (!L) {
    setTimeout(initMap, 300)
    return
  }
  mapInstance = L.map(mapRef.value, {
    center: [35.8617, 104.1954],
    zoom: 4,
    scrollWheelZoom: true
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapInstance)

  markersLayer = L.layerGroup().addTo(mapInstance)
  pathLayer = L.layerGroup().addTo(mapInstance)
  travelLayer = L.layerGroup().addTo(mapInstance)

  loadData()
}

const loadData = async () => {
  mapData.value = await api.stats.map()
  if (mapInstance) renderMap()
}

const renderMap = () => {
  if (!mapInstance) return
  const L = window.L
  markersLayer.clearLayers()
  pathLayer.clearLayers()
  travelLayer.clearLayers()

  const bounds = []
  const { travels, media } = mapData.value

  travels.forEach((t, idx) => {
    const color = colorList[idx % colorList.length]
    if (t.latitude && t.longitude) {
      bounds.push([t.latitude, t.longitude])
      const icon = L.divIcon({
        className: 'map-travel-marker',
        html: `<div style="
          background:${color};
          padding:6px 12px;
          border-radius:18px;
          color:#fff;
          font-size:12px;
          font-weight:600;
          white-space:nowrap;
          box-shadow:0 3px 12px rgba(0,0,0,0.25);
          border:2px solid #fff;
          display:flex;
          align-items:center;
          gap:4px;
        ">✈️ ${escapeHtml(t.title)}</div>`,
        iconSize: null,
        iconAnchor: [0, 0]
      })
      const marker = L.marker([t.latitude, t.longitude], { icon, zIndexOffset: 1000 }).addTo(travelLayer)
      marker.bindPopup(buildTravelPopup(t, color))
    }
  })

  const mediaByTravel = {}
  media.forEach(m => {
    const tid = m.travel_id || 'none'
    if (!mediaByTravel[tid]) mediaByTravel[tid] = []
    mediaByTravel[tid].push(m)
  })

  Object.entries(mediaByTravel).forEach(([tid, items]) => {
    const tIdx = travels.findIndex(t => t.id === Number(tid))
    const c = tIdx >= 0 ? colorList[tIdx % colorList.length] : '#b0b0b0'
    const sorted = [...items]
      .filter(m => m.latitude && m.longitude)
      .sort((a, b) => new Date(a.taken_at || a.created_at) - new Date(b.taken_at || b.created_at))

    sorted.forEach(m => {
      bounds.push([m.latitude, m.longitude])
      const isVideo = m.file_type === 'video'
      const iconSize = isVideo ? 16 : 14
      const iconHtml = isVideo
        ? `<div style="
            background:${c};
            width:${iconSize}px;
            height:${iconSize}px;
            border-radius:50%;
            border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;
            align-items:center;
            justify-content:center;
          "><span style="font-size:7px;color:#fff">▶</span></div>`
        : `<div style="
            background:${c};
            width:${iconSize}px;
            height:${iconSize}px;
            border-radius:50%;
            border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          "></div>`
      const pointIcon = L.divIcon({
        className: 'map-point-marker',
        html: iconHtml,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
      })
      const marker = L.marker([m.latitude, m.longitude], { icon: pointIcon }).addTo(markersLayer)
      marker.bindPopup(buildMediaPopup(m), { maxWidth: 260 })
    })

    if (sorted.length >= 2) {
      const path = sorted.map(m => [m.latitude, m.longitude])
      L.polyline(path, {
        color: c,
        weight: 3,
        opacity: 0.65,
        dashArray: '8, 5',
        lineJoin: 'round'
      }).addTo(pathLayer)

      const arrowIcon = L.divIcon({
        className: 'arrow-marker',
        html: `<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid ${c};transform:rotate(180deg)"></div>`,
        iconSize: [12, 10],
        iconAnchor: [6, 5]
      })
      const mid = Math.floor(sorted.length / 2)
      if (sorted[mid] && sorted[mid + 1]) {
        const p1 = sorted[mid]
        const p2 = sorted[mid + 1]
        const mx = (p1.latitude + p2.latitude) / 2
        const my = (p1.longitude + p2.longitude) / 2
        L.marker([mx, my], { icon: arrowIcon }).addTo(pathLayer)
      }
    }
  })

  if (bounds.length >= 1) {
    try {
      const b = L.latLngBounds(bounds)
      mapInstance.fitBounds(b, { padding: [60, 60], maxZoom: 10 })
    } catch(e) {}
  }
}

const fitBounds = () => {
  if (!mapInstance) return
  renderMap()
}

const buildTravelPopup = (t, color) => {
  return `
    <div style="min-width:240px;padding:4px">
      <h4 style="margin:0 0 10px;padding:6px 10px;background:${color}15;border-left:3px solid ${color};border-radius:4px;color:${color};font-size:14px;font-weight:700">
        ✈️ ${escapeHtml(t.title)}
      </h4>
      ${t.location ? `<p style="margin:0 0 8px;font-size:12px;color:#666">📍 <b>${escapeHtml(t.location)}</b></p>` : ''}
      ${t.start_date ? `<p style="margin:0 0 8px;font-size:12px;color:#666">📅 <b>${t.start_date}</b>${t.end_date ? ' ~ ' + t.end_date : ''}</p>` : ''}
      ${t.description ? `<p style="margin:8px 0 0;font-size:12px;color:#555;line-height:1.6;background:#faf6f0;padding:8px;border-radius:6px">${escapeHtml(t.description.slice(0, 120))}${t.description.length > 120 ? '...' : ''}</p>` : ''}
      <div style="margin-top:10px;text-align:right">
        <a href="#" onclick="window.dispatchEvent(new CustomEvent('goTravel',{detail:${t.id}}));return false;" style="color:${color};font-size:12px;text-decoration:none;font-weight:600">查看详情 →</a>
      </div>
    </div>
  `
}

const buildMediaPopup = (m) => {
  const imgSrc = m.file_type === 'image' ? `file:///${m.file_path.replace(/\\/g, '/')}` : ''
  return `
    <div style="min-width:200px">
      ${m.file_type === 'image' ? `<img src="${imgSrc}" style="width:100%;max-height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block" onerror="this.style.display='none'" />` :
      m.file_type === 'video' ? `<div style="height:80px;background:#f0ebe3;border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;color:#c4a77d;font-size:12px">🎬 视频文件</div>` : ''}
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#4a4a4a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.title || m.original_name || '未命名')}</p>
      ${m.taken_at ? `<p style="margin:0 0 4px;font-size:11px;color:#7eb8da">📷 ${m.taken_at.slice(0, 10)}</p>` : ''}
      ${m.location ? `<p style="margin:0;font-size:11px;color:#888">📍 ${escapeHtml(m.location)}</p>` : ''}
    </div>
  `
}

const escapeHtml = (s) => {
  if (!s) return ''
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
}

const goTravel = (id) => {
  router.push(`/travels/${id}`)
}

onMounted(() => {
  initMap()
  window.addEventListener('goTravel', (e) => {
    goTravel(e.detail)
  })
})

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style lang="less" scoped>
.map-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    .section-title { margin: 0; }
  }
  .header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .map-wrapper {
    position: relative;
    height: 540px;
    border-radius: 16px;
    overflow: hidden;
    border: 2px solid #fff;
    box-shadow: 0 6px 24px rgba(126, 184, 218, 0.15);
    margin-bottom: 20px;
  }

  .leaflet-map {
    width: 100%;
    height: 100%;
    background: #e9f0f5;
  }

  :deep(.map-travel-marker),
  :deep(.map-point-marker),
  :deep(.arrow-marker) {
    background: transparent;
    border: none;
  }

  .map-overlay {
    position: absolute;
    inset: 0;
    background: rgba(250, 246, 240, 0.92);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .overlay-card {
    text-align: center;
    padding: 36px 48px;
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);

    .oc-icon {
      margin-bottom: 16px;
      opacity: 0.6;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 18px;
      color: #4a4a4a;
    }
    p {
      margin: 0;
      font-size: 13px;
      color: #8a8a8a;
      line-height: 1.8;
    }
  }

  .map-legend {
    background: #fff;
    border: 1px solid #f0ebe3;
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 20px;

    .legend-title {
      font-size: 13px;
      font-weight: 600;
      color: #a88a5c;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-list {
      display: flex;
      flex-wrap: wrap;
      gap: 14px 24px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #555;
    }

    .lg-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .lg-name {
      font-weight: 500;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lg-count {
      color: #999;
      font-size: 11px;
    }
  }

  .locations-card {
    border-radius: 16px !important;

    :deep(.arco-card-header) {
      border-bottom: 1px solid #f0ebe3;
    }
  }

  .travel-name-cell {
    color: #5a9fc4;
    cursor: pointer;
    font-weight: 500;
    &:hover { text-decoration: underline; }
  }
}
</style>
