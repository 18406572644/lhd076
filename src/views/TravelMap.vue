<template>
  <div class="page-container map-page">
    <div class="page-header">
      <h2 class="section-title">旅行足迹地图</h2>
      <div class="header-actions">
        <a-tag color="blue">📸 {{ visibleMediaCount }} 张带位置照片</a-tag>
        <a-tag color="orange">✈️ {{ visibleTravelCount }} 次地点旅行</a-tag>
        <a-button size="small" @click="fitBounds" :icon="iconFullscreen">适配视图</a-button>
        <a-button size="small" @click="exportMapImage" :icon="iconDownload">导出图片</a-button>
      </div>
    </div>

    <div class="map-toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">地图模式：</span>
        <a-radio-group type="button" size="small" v-model="viewMode" @change="onViewModeChange">
          <a-radio value="normal">标准标记</a-radio>
          <a-radio value="heat">热力图</a-radio>
        </a-radio-group>
      </div>
      <div class="toolbar-group">
        <span class="toolbar-label">图层：</span>
        <a-radio-group type="button" size="small" v-model="tileLayer" @change="onTileLayerChange">
          <a-radio value="standard">标准</a-radio>
          <a-radio value="satellite">卫星</a-radio>
          <a-radio value="terrain">地形</a-radio>
        </a-radio-group>
      </div>
    </div>

    <div class="map-wrapper" ref="mapWrapperRef">
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

    <div class="map-side-panel" v-if="mapData.travels.length">
      <div class="panel-header">
        <div class="panel-title">
          <icon-filter :size="14" /> 按旅行筛选
        </div>
        <div class="panel-actions">
          <a-button type="text" size="mini" @click="selectAllTravels">全选</a-button>
          <a-button type="text" size="mini" @click="clearTravelSelection">清空</a-button>
        </div>
      </div>
      <div class="travel-filter-list">
        <div
          v-for="(t, idx) in mapData.travels"
          :key="t.id"
          class="travel-filter-item"
          :class="{ active: selectedTravelIds.includes(t.id) }"
          @click="toggleTravel(t.id)"
        >
          <a-checkbox :model-value="selectedTravelIds.includes(t.id)" />
          <span class="tf-color" :style="{ background: getTravelColor(idx) }"></span>
          <span class="tf-name">{{ t.title }}</span>
          <span class="tf-count">{{ getTravelMediaCount(t.id) }}</span>
        </div>
        <div
          v-if="uncategorizedCount > 0"
          class="travel-filter-item"
          :class="{ active: showUncategorized }"
          @click="toggleUncategorized"
        >
          <a-checkbox :model-value="showUncategorized" />
          <span class="tf-color" style="background:#b0b0b0"></span>
          <span class="tf-name">未分类</span>
          <span class="tf-count">{{ uncategorizedCount }}</span>
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

    <a-modal
      v-model:visible="previewVisible"
      :footer="false"
      :title="previewTitle"
      width="720px"
      unmount-on-close
      class="photo-preview-modal"
    >
      <div class="photo-preview" v-if="currentPreviewMedia">
        <div class="preview-image-wrap">
          <a-button
            v-if="hasPrevPreview"
            class="preview-nav-btn prev"
            type="text"
            :icon="iconLeft"
            @click="prevPreview"
          />
          <template v-if="currentPreviewMedia.file_type === 'image'">
            <img :src="previewImgSrc" class="preview-img" @error="previewImgError = true" />
          </template>
          <template v-else-if="currentPreviewMedia.file_type === 'video'">
            <div class="preview-video-placeholder">
              <icon-play-circle :size="64" />
              <div>视频文件</div>
            </div>
          </template>
          <template v-else>
            <div class="preview-video-placeholder">
              <icon-file :size="64" />
              <div>其他文件</div>
            </div>
          </template>
          <a-button
            v-if="hasNextPreview"
            class="preview-nav-btn next"
            type="text"
            :icon="iconRight"
            @click="nextPreview"
          />
        </div>
        <div class="preview-info" v-if="currentPreviewMedia">
          <div class="pi-title">{{ currentPreviewMedia.title || currentPreviewMedia.original_name || '未命名' }}</div>
          <div class="pi-meta">
            <span v-if="currentPreviewMedia.taken_at">📷 {{ currentPreviewMedia.taken_at.slice(0, 10) }}</span>
            <span v-if="currentPreviewMedia.location">📍 {{ currentPreviewMedia.location }}</span>
            <span>{{ previewIndex + 1 }} / {{ previewList.length }}</span>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconFullscreen,
  IconInfo,
  IconFilter,
  IconDownload,
  IconLeft,
  IconRight,
  IconPlayCircle,
  IconFile
} from '@arco-design/web-vue/es/icon'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import html2canvas from 'html2canvas'

const router = useRouter()
const api = window.electronAPI
const iconFullscreen = IconFullscreen
const iconInfo = IconInfo
const iconFilter = IconFilter
const iconDownload = IconDownload
const iconLeft = IconLeft
const iconRight = IconRight
const iconPlayCircle = IconPlayCircle
const iconFile = IconFile

const mapRef = ref(null)
const mapWrapperRef = ref(null)
let mapInstance = null
let markersLayer = null
let pathLayer = null
let travelLayer = null
let heatLayer = null
let currentTileLayer = null

const mapData = ref({ travels: [], media: [] })
const viewMode = ref('normal')
const tileLayer = ref('standard')
const selectedTravelIds = ref([])
const showUncategorized = ref(true)

const previewVisible = ref(false)
const previewList = ref([])
const previewIndex = ref(0)
const previewImgError = ref(false)

const colorList = ['#7eb8da', '#c4a77d', '#e8a5b9', '#8bc9a0', '#b59ad6', '#f2d59e', '#f3a683']

const tileLayers = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri World Imagery',
    maxZoom: 19
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
    maxZoom: 17
  }
}

const hasData = computed(() => {
  const { travels, media } = mapData.value
  return travels.some(t => t.latitude && t.longitude) ||
         media.some(m => m.latitude && m.longitude)
})

const filteredMedia = computed(() => {
  return mapData.value.media.filter(m => {
    if (!m.latitude || !m.longitude) return false
    if (!m.travel_id) return showUncategorized.value
    return selectedTravelIds.value.includes(m.travel_id)
  })
})

const filteredTravels = computed(() => {
  return mapData.value.travels.filter(t => selectedTravelIds.value.includes(t.id))
})

const visibleMediaCount = computed(() => filteredMedia.value.length)
const visibleTravelCount = computed(() => filteredTravels.value.filter(t => t.latitude && t.longitude).length)

const uncategorizedCount = computed(() => {
  return mapData.value.media.filter(m => !m.travel_id && m.latitude && m.longitude).length
})

const getTravelColor = (idx) => colorList[idx % colorList.length]

const getTravelMediaCount = (travelId) => {
  return mapData.value.media.filter(m => m.travel_id === travelId && m.latitude && m.longitude).length
}

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
    if (!selectedTravelIds.value.includes(t.id)) return
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
  if (uncategorizedCount.value > 0 && showUncategorized.value) {
    items.push({ name: '未分类', count: uncategorizedCount.value, color: '#b0b0b0' })
  }
  return items
})

const currentPreviewMedia = computed(() => previewList.value[previewIndex.value])
const hasPrevPreview = computed(() => previewIndex.value > 0)
const hasNextPreview = computed(() => previewIndex.value < previewList.value.length - 1)
const previewImgSrc = computed(() => {
  if (!currentPreviewMedia.value?.file_path) return ''
  return 'file:///' + currentPreviewMedia.value.file_path.replace(/\\/g, '/')
})
const previewTitle = computed(() => currentPreviewMedia.value?.title || currentPreviewMedia.value?.original_name || '照片预览')

const initMap = () => {
  if (!mapRef.value || mapInstance) return
  mapInstance = L.map(mapRef.value, {
    center: [35.8617, 104.1954],
    zoom: 4,
    scrollWheelZoom: true
  })

  const tl = tileLayers[tileLayer.value]
  currentTileLayer = L.tileLayer(tl.url, {
    attribution: tl.attribution,
    maxZoom: tl.maxZoom
  }).addTo(mapInstance)

  markersLayer = L.layerGroup().addTo(mapInstance)
  pathLayer = L.layerGroup().addTo(mapInstance)
  travelLayer = L.layerGroup().addTo(mapInstance)

  loadData()
}

const onTileLayerChange = () => {
  if (!mapInstance) return
  if (currentTileLayer) {
    mapInstance.removeLayer(currentTileLayer)
  }
  const tl = tileLayers[tileLayer.value]
  currentTileLayer = L.tileLayer(tl.url, {
    attribution: tl.attribution,
    maxZoom: tl.maxZoom
  }).addTo(mapInstance)
}

const onViewModeChange = () => {
  renderMap()
}

const loadData = async () => {
  mapData.value = await api.stats.map()
  selectedTravelIds.value = mapData.value.travels.map(t => t.id)
  if (mapInstance) renderMap()
}

const toggleTravel = (id) => {
  const idx = selectedTravelIds.value.indexOf(id)
  if (idx >= 0) {
    selectedTravelIds.value.splice(idx, 1)
  } else {
    selectedTravelIds.value.push(id)
  }
  renderMap()
}

const toggleUncategorized = () => {
  showUncategorized.value = !showUncategorized.value
  renderMap()
}

const selectAllTravels = () => {
  selectedTravelIds.value = mapData.value.travels.map(t => t.id)
  showUncategorized.value = true
  renderMap()
}

const clearTravelSelection = () => {
  selectedTravelIds.value = []
  showUncategorized.value = false
  renderMap()
}

const renderMap = () => {
  if (!mapInstance) return
  markersLayer.clearLayers()
  pathLayer.clearLayers()
  travelLayer.clearLayers()
  if (heatLayer) {
    mapInstance.removeLayer(heatLayer)
    heatLayer = null
  }

  if (viewMode.value === 'heat') {
    renderHeatMap()
  } else {
    renderNormalMap()
  }
}

const renderNormalMap = () => {
  if (!mapInstance) return
  const bounds = []
  const travels = filteredTravels.value
  const media = filteredMedia.value

  travels.forEach((t) => {
    const idx = mapData.value.travels.findIndex(x => x.id === t.id)
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
    const tIdx = mapData.value.travels.findIndex(t => t.id === Number(tid))
    const c = tIdx >= 0 ? colorList[tIdx % colorList.length] : '#b0b0b0'
    const sorted = [...items]
      .filter(m => m.latitude && m.longitude)
      .sort((a, b) => new Date(a.taken_at || a.created_at) - new Date(b.taken_at || b.created_at))

    sorted.forEach((m, mIdx) => {
      bounds.push([m.latitude, m.longitude])
      const isVideo = m.file_type === 'video'
      const iconSize = isVideo ? 18 : 16
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
            cursor:pointer;
          "><span style="font-size:8px;color:#fff">▶</span></div>`
        : `<div style="
            background:${c};
            width:${iconSize}px;
            height:${iconSize}px;
            border-radius:50%;
            border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            cursor:pointer;
          "></div>`
      const pointIcon = L.divIcon({
        className: 'map-point-marker',
        html: iconHtml,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
      })
      const marker = L.marker([m.latitude, m.longitude], { icon: pointIcon }).addTo(markersLayer)
      marker.on('click', () => openPreview(sorted, mIdx))
      marker.bindPopup(buildMediaPopup(m, c), { maxWidth: 260 })
    })

    if (sorted.length >= 2) {
      const path = sorted.map(m => [m.latitude, m.longitude])
      L.polyline(path, {
        color: c,
        weight: 4,
        opacity: 0.75,
        dashArray: '10, 6',
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(pathLayer)

      for (let i = 0; i < sorted.length - 1; i++) {
        const p1 = sorted[i]
        const p2 = sorted[i + 1]
        const mx = (p1.latitude + p2.latitude) / 2
        const my = (p1.longitude + p2.longitude) / 2
        const angle = calculateAngle(p1, p2)
        const arrowIcon = L.divIcon({
          className: 'arrow-marker',
          html: `<div style="
            width:0;
            height:0;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-bottom:8px solid ${c};
            transform: rotate(${angle}deg);
            opacity:0.8;
          "></div>`,
          iconSize: [10, 8],
          iconAnchor: [5, 4]
        })
        L.marker([mx, my], { icon: arrowIcon, interactive: false }).addTo(pathLayer)
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

const renderHeatMap = () => {
  if (!mapInstance) return
  const media = filteredMedia.value
  const travels = filteredTravels.value
  const bounds = []
  const heatPoints = []

  travels.forEach(t => {
    if (t.latitude && t.longitude) {
      bounds.push([t.latitude, t.longitude])
      heatPoints.push([t.latitude, t.longitude, 0.5])
    }
  })

  media.forEach(m => {
    if (m.latitude && m.longitude) {
      bounds.push([m.latitude, m.longitude])
      heatPoints.push([m.latitude, m.longitude, 0.8])
    }
  })

  if (heatPoints.length > 0 && L.heatLayer) {
    heatLayer = L.heatLayer(heatPoints, {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      gradient: {
        0.2: '#7eb8da',
        0.4: '#8bc9a0',
        0.6: '#f2d59e',
        0.8: '#f3a683',
        1.0: '#e8a5b9'
      }
    }).addTo(mapInstance)
  }

  if (bounds.length >= 1) {
    try {
      const b = L.latLngBounds(bounds)
      mapInstance.fitBounds(b, { padding: [60, 60], maxZoom: 10 })
    } catch(e) {}
  }
}

const calculateAngle = (p1, p2) => {
  const dLat = p2.latitude - p1.latitude
  const dLon = p2.longitude - p1.longitude
  const angleRad = Math.atan2(dLon, dLat)
  return angleRad * (180 / Math.PI)
}

const fitBounds = () => {
  if (!mapInstance) return
  renderMap()
}

const openPreview = (list, index) => {
  previewList.value = list
  previewIndex.value = index
  previewImgError.value = false
  previewVisible.value = true
}

const prevPreview = () => {
  if (hasPrevPreview.value) {
    previewIndex.value--
    previewImgError.value = false
  }
}

const nextPreview = () => {
  if (hasNextPreview.value) {
    previewIndex.value++
    previewImgError.value = false
  }
}

const exportMapImage = async () => {
  if (!mapWrapperRef.value) return
  try {
    Message.loading({ content: '正在生成图片...', duration: 0, id: 'export-loading' })
    await nextTick()
    const canvas = await html2canvas(mapWrapperRef.value, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    })
    const link = document.createElement('a')
    link.download = `travel-map-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    Message.clear('export-loading')
    Message.success('地图图片已导出')
  } catch (e) {
    console.error(e)
    Message.clear('export-loading')
    Message.error('导出失败，请重试')
  }
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

const buildMediaPopup = (m, color) => {
  const imgSrc = m.file_type === 'image' ? `file:///${m.file_path.replace(/\\/g, '/')}` : ''
  return `
    <div style="min-width:200px">
      ${m.file_type === 'image' ? `<img src="${imgSrc}" style="width:100%;max-height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block;cursor:pointer" onerror="this.style.display='none'" />` :
      m.file_type === 'video' ? `<div style="height:80px;background:#f0ebe3;border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;color:#c4a77d;font-size:12px">🎬 视频文件</div>` : ''}
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#4a4a4a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.title || m.original_name || '未命名')}</p>
      ${m.taken_at ? `<p style="margin:0 0 4px;font-size:11px;color:#7eb8da">📷 ${m.taken_at.slice(0, 10)}</p>` : ''}
      ${m.location ? `<p style="margin:0;font-size:11px;color:#888">📍 ${escapeHtml(m.location)}</p>` : ''}
      <p style="margin:6px 0 0;font-size:11px;color:${color};font-weight:500">💡 点击标记查看大图</p>
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
  window.addEventListener('keydown', (e) => {
    if (!previewVisible.value) return
    if (e.key === 'ArrowLeft') prevPreview()
    if (e.key === 'ArrowRight') nextPreview()
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
  position: relative;
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

  .map-toolbar {
    display: flex;
    gap: 24px;
    margin-bottom: 14px;
    flex-wrap: wrap;
    align-items: center;

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-label {
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }
  }

  .map-wrapper {
    position: relative;
    height: 560px;
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

  :deep(.leaflet-popup-content-wrapper) {
    border-radius: 10px;
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

  .map-side-panel {
    position: absolute;
    right: 24px;
    top: 120px;
    width: 240px;
    background: #fff;
    border: 1px solid #f0ebe3;
    border-radius: 14px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    z-index: 500;
    overflow: hidden;

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: #faf6f0;
      border-bottom: 1px solid #f0ebe3;

      .panel-title {
        font-size: 13px;
        font-weight: 600;
        color: #a88a5c;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .panel-actions {
        display: flex;
        gap: 4px;
      }
    }

    .travel-filter-list {
      max-height: 320px;
      overflow-y: auto;
      padding: 6px;
    }

    .travel-filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 2px;

      &:hover {
        background: #faf6f0;
      }
      &.active {
        background: #f5f0e6;
      }

      .tf-color {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        border: 2px solid #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      }
      .tf-name {
        flex: 1;
        font-size: 12px;
        color: #555;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tf-count {
        font-size: 11px;
        color: #999;
        background: #f0ebe3;
        padding: 2px 7px;
        border-radius: 10px;
      }
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

.photo-preview-modal {
  :deep(.arco-modal-body) {
    padding: 0;
  }
}

.photo-preview {
  .preview-image-wrap {
    position: relative;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 420px;
    max-height: 520px;

    .preview-img {
      max-width: 100%;
      max-height: 520px;
      object-fit: contain;
    }
    .preview-video-placeholder {
      color: #fff;
      opacity: 0.6;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      font-size: 14px;
    }
    .preview-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      color: #fff;
      font-size: 20px;
      &:hover {
        background: rgba(255,255,255,0.3);
        color: #fff;
      }
      &.prev { left: 12px; }
      &.next { right: 12px; }
    }
  }
  .preview-info {
    padding: 16px 20px;
    background: #faf6f0;

    .pi-title {
      font-size: 15px;
      font-weight: 600;
      color: #4a4a4a;
      margin-bottom: 8px;
    }
    .pi-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #888;
    }
  }
}
</style>
