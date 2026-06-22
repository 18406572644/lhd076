<template>
  <div class="page-container travel-detail" v-if="travel">
    <div class="detail-header" :style="coverStyle">
      <div class="header-mask"></div>
      <div class="header-inner">
        <a-button type="text" :icon="iconBackward" @click="$router.back()" class="back-btn">
          返回
        </a-button>
        <div class="header-content">
          <h1 class="travel-title">{{ travel.title }}</h1>
          <div class="travel-meta">
            <span v-if="travel.location"><icon-location /> {{ travel.location }}</span>
            <span v-if="travel.start_date">
              <icon-calendar /> {{ formatDate(travel.start_date) }} ~ {{ formatDate(travel.end_date || travel.start_date) }}
              <em class="duration">共 {{ days }} 天</em>
            </span>
            <span><icon-image /> {{ travel.media_count || 0 }} 张</span>
            <span><icon-file-image /> {{ travel.album_count || 0 }} 相册</span>
          </div>
          <div class="header-actions">
            <a-button size="small" @click="importVisible = true" :icon="iconUpload">导入照片</a-button>
            <a-button size="small" @click="formVisible = true" :icon="iconEdit">编辑</a-button>
            <a-button size="small" type="outline" @click="goTimeline">
              <icon-calendar /> 时间轴
            </a-button>
            <a-button size="small" type="outline" @click="exportReport">
              <icon-file /> 生成报告
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <a-tabs v-model:active-tab="activeTab" type="rounded" size="large" class="detail-tabs">
      <a-tab-pane key="media" title="照片与视频">
        <div class="tab-toolbar">
          <div class="toolbar-left">
            <a-radio-group v-model="viewMode" type="button" size="small">
              <a-radio value="grid">网格</a-radio>
              <a-radio value="timeline">时间</a-radio>
            </a-radio-group>
            <a-space>
              <a-tag-checkable v-model="filterFav" color="orange" size="small">仅看收藏</a-tag-checkable>
              <a-select v-model="filterType" placeholder="类型" allow-clear style="width: 110px" size="small">
                <a-option value="image">仅照片</a-option>
                <a-option value="video">仅视频</a-option>
              </a-select>
            </a-space>
          </div>
          <div class="toolbar-right">
            <a-input-search v-model="search" placeholder="搜索..." size="small" style="width: 200px" allow-clear />
            <a-button size="small" type="outline" :disabled="!selectedIds.length" @click="openAddToAlbum">
              加入相册 {{ selectedIds.length ? `(${selectedIds.length})` : '' }}
            </a-button>
            <a-button size="small" status="danger" type="outline" :disabled="!selectedIds.length" @click="batchDelete">
              删除
            </a-button>
          </div>
        </div>

        <div v-if="viewMode === 'grid'" class="media-grid selectable">
          <MediaCard
            v-for="m in filteredMedia"
            :key="m.id"
            :media="m"
            :selectable="true"
            :selected="selectedIds.includes(m.id)"
            @click="openPreview(m, idx(filteredMedia, m))"
            @select="(sel) => toggleSelect(m.id, sel)"
          />
        </div>
        <div v-else class="media-timeline">
          <div v-for="(group, gIdx) in groupedMedia" :key="gIdx" class="tl-group">
            <div class="tl-date">{{ group[0] }}</div>
            <div class="tl-items">
              <MediaCard
                v-for="m in group[1]"
                :key="m.id"
                :media="m"
                :selectable="true"
                :selected="selectedIds.includes(m.id)"
                @click="openPreview(m, flatIdx(m.id))"
                @select="(sel) => toggleSelect(m.id, sel)"
              />
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="albums" title="相册">
        <div class="album-toolbar">
          <a-button type="primary" size="small" :icon="iconPlus" @click="albumFormVisible = true">新建相册</a-button>
        </div>
        <div class="albums-grid">
          <div
            v-for="a in travelAlbums"
            :key="a.id"
            class="album-card tm-card-hover"
            @click="goAlbum(a.id)"
          >
            <div class="album-cover" :style="albumCoverStyle(a)">
              <div class="album-placeholder" v-if="!a.cover_image">
                <icon-file-image :size="30" />
              </div>
              <div class="album-count">{{ a.media_count }} 张</div>
            </div>
            <div class="album-info">
              <div class="album-title">{{ a.title }}</div>
              <div class="album-desc" v-if="a.description">{{ a.description }}</div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="itinerary" title="行程">
        <ItineraryEditor :travelId="travelId" @change="true" />
      </a-tab-pane>

      <a-tab-pane key="expenses" title="花费">
        <ExpenseTracker :travelId="travelId" />
      </a-tab-pane>

      <a-tab-pane key="map" title="地图足迹">
        <div class="embedded-map">
          <MiniTravelMap :travelId="travelId" />
        </div>
      </a-tab-pane>

      <a-tab-pane key="info" title="详情">
        <a-descriptions :column="1" bordered style="max-width: 600px;">
          <a-descriptions-item label="描述">
            {{ travel.description || '暂无描述' }}
          </a-descriptions-item>
          <a-descriptions-item label="标签">
            <a-tag v-for="t in parseTags(travel.tags)" :key="t" color="blue">{{ t }}</a-tag>
            <span v-if="!parseTags(travel.tags).length">暂无标签</span>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatDateTime(travel.created_at) }}</a-descriptions-item>
        </a-descriptions>
      </a-tab-pane>
    </a-tabs>

    <ImportModal v-model="importVisible" :defaultTravelId="travelId" @success="loadMedia" />
    <TravelFormModal v-model="formVisible" :travel="travel" @success="loadTravel" />
    <AlbumFormModal v-model="albumFormVisible" :defaultTravelId="travelId" @success="loadAlbums" />
    <MediaPreview
      v-model="previewVisible"
      :media="currentMedia"
      :mediaList="flatMedia"
      :currentIndex="previewIndex"
      @change="onPreviewChange"
      @delete="onMediaDelete"
    />
    <AddToAlbumModal v-model="addToAlbumVisible" :mediaIds="selectedIds" @success="clearSelection" />
  </div>
  <a-empty v-else description="加载中..." />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconBackward,
  IconLocation,
  IconCalendar,
  IconImage,
  IconFileImage,
  IconUpload,
  IconEdit,
  IconFile,
  IconPlus
} from '@arco-design/web-vue/es/icon'
import MediaCard from '@/components/MediaCard.vue'
import MediaPreview from '@/components/MediaPreview.vue'
import ImportModal from '@/components/ImportModal.vue'
import TravelFormModal from '@/components/TravelFormModal.vue'
import AlbumFormModal from '@/components/AlbumFormModal.vue'
import AddToAlbumModal from '@/components/AddToAlbumModal.vue'
import ItineraryEditor from '@/components/ItineraryEditor.vue'
import ExpenseTracker from '@/components/ExpenseTracker.vue'
import MiniTravelMap from '@/components/MiniTravelMap.vue'
import { formatDate, formatDateTime, parseTags, groupByDate, getDateRange } from '@/utils'

const route = useRoute()
const router = useRouter()
const api = window.electronAPI

const iconBackward = IconBackward
const iconLocation = IconLocation
const iconCalendar = IconCalendar
const iconImage = IconImage
const iconPicture = IconFileImage
const iconUpload = IconUpload
const iconEdit = IconEdit
const iconFile = IconFile
const iconPlus = IconPlus

const travelId = computed(() => +route.params.id)
const travel = ref(null)
const media = ref([])
const albums = ref([])
const activeTab = ref('media')
const viewMode = ref('grid')
const search = ref('')
const filterFav = ref(false)
const filterType = ref('')
const selectedIds = ref([])
const importVisible = ref(false)
const formVisible = ref(false)
const albumFormVisible = ref(false)
const previewVisible = ref(false)
const previewIndex = ref(0)
const addToAlbumVisible = ref(false)

const days = computed(() => getDateRange(travel.value?.start_date, travel.value?.end_date))

const coverStyle = computed(() => {
  if (travel.value?.cover_image) {
    return { backgroundImage: `url(file:///${travel.value.cover_image.replace(/\\/g, '/')})` }
  }
  return {}
})

const travelAlbums = computed(() => albums.value.filter(a => a.travel_id === travelId.value))

const filteredMedia = computed(() => {
  let list = media.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(m =>
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.original_name && m.original_name.toLowerCase().includes(q)) ||
      (m.location && m.location.toLowerCase().includes(q))
    )
  }
  if (filterFav.value) list = list.filter(m => m.is_favorite)
  if (filterType.value) list = list.filter(m => m.file_type === filterType.value)
  return list
})

const flatMedia = computed(() => {
  if (viewMode.value === 'grid') return filteredMedia.value
  const arr = []
  for (const g of groupedMedia.value) arr.push(...g[1])
  return arr
})

const groupedMedia = computed(() => groupByDate(filteredMedia.value))

const currentMedia = computed(() => flatMedia.value[previewIndex.value] || null)

const idx = (arr, item) => arr.indexOf(item)
const flatIdx = (id) => flatMedia.value.findIndex(m => m.id === id)

const toggleSelect = (id, sel) => {
  if (sel) {
    if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
  } else {
    selectedIds.value = selectedIds.value.filter(x => x !== id)
  }
}

const clearSelection = () => { selectedIds.value = [] }

const openPreview = (m, i) => {
  previewIndex.value = i
  previewVisible.value = true
}

const onPreviewChange = (i) => { previewIndex.value = i }

const onMediaDelete = async (id) => {
  media.value = media.value.filter(m => m.id !== id)
  await loadTravel()
}

const openAddToAlbum = () => { addToAlbumVisible.value = true }

const batchDelete = async () => {
  for (const id of selectedIds.value) {
    await api.media.delete(id)
  }
  Message.success(`已删除 ${selectedIds.value.length} 个文件`)
  clearSelection()
  await loadMedia()
  await loadTravel()
}

const goTimeline = () => { router.push('/timeline') }
const goAlbum = (id) => { router.push(`/albums/${id}`) }

const exportReport = () => {
  router.push({ path: '/report', query: { travel: travelId.value } })
}

const albumCoverStyle = (a) => {
  if (a.cover_image) return { backgroundImage: `url(file:///${a.cover_image.replace(/\\/g, '/')})` }
  const albumMedia = media.value.find(m => true)
  if (albumMedia?.file_path) return { backgroundImage: `url(file:///${albumMedia.file_path.replace(/\\/g, '/')})` }
  return {}
}

const loadTravel = async () => {
  travel.value = await api.travel.get(travelId.value)
}

const loadMedia = async () => {
  media.value = await api.media.getByTravel(travelId.value)
}

const loadAlbums = async () => {
  albums.value = await api.album.list()
}

onMounted(async () => {
  await loadTravel()
  await loadMedia()
  await loadAlbums()
})

watch(travelId, () => {
  loadTravel()
  loadMedia()
  loadAlbums()
})
</script>

<style lang="less" scoped>
.travel-detail {
  padding-top: 0;
  padding-left: 0;
  padding-right: 0;
}

.detail-header {
  height: 280px;
  position: relative;
  background: linear-gradient(135deg, #a8d8ea, #7eb8da);
  background-size: cover;
  background-position: center;
  margin: -24px -24px 0;

  .header-mask {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.55));
  }

  .header-inner {
    position: relative;
    z-index: 1;
    padding: 20px 24px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .back-btn {
    width: fit-content;
    color: rgba(255,255,255,0.9) !important;
    margin-bottom: 8px;
    &:hover { background: rgba(255,255,255,0.15); }
  }

  .header-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #fff;
  }

  .travel-title {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 12px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  .travel-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-bottom: 16px;
    font-size: 13px;
    opacity: 0.95;
    text-shadow: 0 1px 3px rgba(0,0,0,0.25);

    span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .duration {
      color: #f2d59e;
      font-style: normal;
      font-weight: 600;
    }
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }
}

.detail-tabs {
  padding: 20px 24px 0;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;

  .toolbar-left, .toolbar-right {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.media-timeline {
  .tl-group {
    margin-bottom: 24px;
  }
  .tl-date {
    font-size: 13px;
    font-weight: 600;
    color: #a88a5c;
    padding: 6px 12px;
    background: #f5efe6;
    border-radius: 8px;
    display: inline-block;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }
  .tl-items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}

.album-toolbar {
  margin-bottom: 16px;
}

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.album-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #f0ebe3;
}

.album-cover {
  height: 140px;
  background: linear-gradient(135deg, #dcc9a8, #c4a77d);
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.85);

  .album-count {
    position: absolute;
    right: 8px;
    bottom: 8px;
    background: rgba(0,0,0,0.5);
    color: #fff;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
  }
}

.album-info {
  padding: 12px;
  .album-title {
    font-weight: 600;
    color: #4a4a4a;
    margin-bottom: 4px;
  }
  .album-desc {
    font-size: 12px;
    color: #a0a0a0;
    line-height: 1.4;
  }
}

.embedded-map {
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
}
</style>
