<template>
  <div class="page-container media-page">
    <div class="page-header">
      <h2 class="section-title">媒体库</h2>
      <div class="header-actions">
        <a-button :icon="iconUpload" type="primary" @click="importVisible = true">导入媒体</a-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-left">
        <a-radio-group v-model="viewMode" type="button" size="small">
          <a-radio value="grid">
            <icon-apps :size="14" /> 网格
          </a-radio>
          <a-radio value="timeline">
            <icon-list :size="14" /> 时间轴
          </a-radio>
        </a-radio-group>
        <a-divider type="vertical" style="height: 24px; margin: 0 4px" />
        <a-tag-checkable v-model="filterFav" color="orange" size="small">
          <icon-star :size="12" /> 收藏
        </a-tag-checkable>
        <a-select v-model="filterType" placeholder="类型" allow-clear style="width: 120px" size="small">
          <a-option value="image">仅照片</a-option>
          <a-option value="video">仅视频</a-option>
        </a-select>
        <a-select v-model="filterTravel" placeholder="旅行" allow-clear style="width: 160px" size="small">
          <a-option v-for="t in travels" :key="t.id" :value="t.id">{{ t.title }}</a-option>
        </a-select>
        <a-select v-model="filterTags" mode="multiple" placeholder="标签" allow-clear style="min-width: 180px" size="small">
          <a-option v-for="tg in allTags" :key="tg" :value="tg">{{ tg }}</a-option>
        </a-select>
      </div>
      <div class="filter-right">
        <a-input-search v-model="search" placeholder="搜索标题/文件名/地点..." size="small" style="width: 240px" allow-clear />
        <span class="count-text">共 {{ filteredMedia.length }} 个文件</span>
      </div>
    </div>

    <div class="batch-bar" v-if="selectedIds.length">
      <a-checkbox :model-value="isAllSelected" @change="toggleAll" style="margin-right: 12px">全选</a-checkbox>
      <span style="margin-right: 16px; color: #5a9fc4; font-weight: 500">
        已选择 {{ selectedIds.length }} 项
      </span>
      <a-button size="small" :icon="iconPlus" @click="addToAlbumVisible = true">加入相册</a-button>
      <a-button size="small" type="outline" @click="batchTag">添加标签</a-button>
      <a-button size="small" type="outline" @click="toggleFav">
        {{ allFav ? '取消收藏' : '收藏' }}
      </a-button>
      <a-popconfirm content="确定删除选中的文件？" position="br" @ok="batchDelete">
        <a-button size="small" status="danger" type="outline"><icon-delete :size="12" /> 删除</a-button>
      </a-popconfirm>
      <a-button size="small" type="text" @click="clearSelection">取消选择</a-button>
    </div>

    <div class="content-area">
      <div v-if="viewMode === 'grid'" class="media-grid selectable">
        <MediaCard
          v-for="m in filteredMedia"
          :key="m.id"
          :media="m"
          :selectable="true"
          :selected="selectedIds.includes(m.id)"
          @click="openPreview(m, filteredMedia.indexOf(m))"
          @select="(sel) => toggleSelect(m.id, sel)"
        />
      </div>

      <div v-else class="timeline-view">
        <div v-for="(group, gIdx) in groupedMedia" :key="gIdx" class="tl-group">
          <div class="tl-date-block">
            <div class="tl-date">{{ group[0] }}</div>
            <div class="tl-count">{{ group[1].length }} 个文件</div>
          </div>
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

      <div v-if="!filteredMedia.length" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 200 180" width="160" height="144">
            <defs>
              <linearGradient id="ms1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#f5efe0"/>
                <stop offset="100%" style="stop-color:#efe5d0"/>
              </linearGradient>
            </defs>
            <rect x="40" y="50" width="120" height="90" rx="8" fill="url(#ms1)" stroke="#c4a77d" stroke-width="1.5" stroke-dasharray="4,4"/>
            <rect x="30" y="42" width="24" height="14" rx="3" fill="#dcc9a8"/>
            <circle cx="100" cy="95" r="22" fill="#fff" stroke="#a8d8ea" stroke-width="2"/>
            <circle cx="100" cy="95" r="10" fill="#a8d8ea" opacity="0.5"/>
            <path d="M58 110 L78 90 L92 104 L120 78 L142 100 L142 130 L58 130 Z" fill="#8bc9a0" opacity="0.35"/>
            <circle cx="145" cy="62" r="8" fill="#f2d59e" opacity="0.6"/>
          </svg>
        </div>
        <h3>媒体库空空如也</h3>
        <p>导入照片和视频，开始记录你的旅行故事</p>
        <a-button type="primary" :icon="iconUpload" @click="importVisible = true">
          导入第一个文件
        </a-button>
      </div>
    </div>

    <ImportModal v-model="importVisible" @success="onImportSuccess" />
    <MediaPreview
      v-model="previewVisible"
      :media="currentMedia"
      :mediaList="flatMedia"
      :currentIndex="previewIndex"
      @change="(i) => previewIndex = i"
      @delete="loadMedia"
    />
    <AddToAlbumModal v-model="addToAlbumVisible" :mediaIds="selectedIds" @success="clearSelection" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconUpload,
  IconApps,
  IconList,
  IconStar,
  IconPlus,
  IconDelete
} from '@arco-design/web-vue/es/icon'
import MediaCard from '@/components/MediaCard.vue'
import MediaPreview from '@/components/MediaPreview.vue'
import ImportModal from '@/components/ImportModal.vue'
import AddToAlbumModal from '@/components/AddToAlbumModal.vue'
import { groupByMonth, parseTags } from '@/utils'

const api = window.electronAPI || {}

const iconUpload = IconUpload
const iconApps = IconApps
const iconList = IconList
const iconStar = IconStar
const iconPlus = IconPlus
const iconDelete = IconDelete

const media = ref([])
const travels = ref([])
const allTags = ref([])
const viewMode = ref('grid')
const search = ref('')
const filterFav = ref(false)
const filterType = ref('')
const filterTravel = ref('')
const filterTags = ref([])
const selectedIds = ref([])
const importVisible = ref(false)
const previewVisible = ref(false)
const previewIndex = ref(0)
const addToAlbumVisible = ref(false)

const filteredMedia = computed(() => {
  try {
    let list = media.value || []
    if (search.value) {
      const q = search.value.toLowerCase()
      list = list.filter(m =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.original_name && m.original_name.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q)) ||
        (m.tags && m.tags.toLowerCase().includes(q))
      )
    }
    if (filterFav.value) list = list.filter(m => m.is_favorite)
    if (filterType.value) list = list.filter(m => m.file_type === filterType.value)
    if (filterTravel.value) list = list.filter(m => m.travel_id === filterTravel.value)
    if (filterTags.value && filterTags.value.length) {
      list = list.filter(m => {
        try {
          const t = parseTags(m.tags)
          return filterTags.value.every(ft => t.includes(ft))
        } catch (e) {
          return false
        }
      })
    }
    return list
  } catch (e) {
    console.error('筛选媒体出错:', e)
    return []
  }
})

const groupedMedia = computed(() => {
  try {
    return groupByMonth(filteredMedia.value) || []
  } catch (e) {
    console.error('分组媒体出错:', e)
    return []
  }
})

const flatMedia = computed(() => {
  try {
    if (viewMode.value === 'grid') return filteredMedia.value || []
    const arr = []
    const groups = groupedMedia.value || []
    for (const g of groups) {
      if (g && g[1]) arr.push(...g[1])
    }
    return arr
  } catch (e) {
    console.error('扁平化媒体出错:', e)
    return []
  }
})

const currentMedia = computed(() => flatMedia.value[previewIndex.value] || null)

const isAllSelected = computed(() => {
  if (!filteredMedia.value || !filteredMedia.value.length) return false
  return filteredMedia.value.every(m => selectedIds.value.includes(m.id))
})

const allFav = computed(() => {
  const sel = (filteredMedia.value || []).filter(m => selectedIds.value.includes(m.id))
  return sel.length && sel.every(m => m.is_favorite)
})

const flatIdx = (id) => {
  try {
    return flatMedia.value.findIndex(m => m.id === id)
  } catch (e) {
    return -1
  }
}

const toggleSelect = (id, sel) => {
  if (sel) {
    if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
  } else {
    selectedIds.value = selectedIds.value.filter(x => x.id !== undefined ? x.id !== id : x !== id)
  }
}

const toggleAll = (val) => {
  selectedIds.value = val ? (filteredMedia.value || []).map(m => m.id) : []
}

const clearSelection = () => { selectedIds.value = [] }

const openPreview = (m, i) => {
  previewIndex.value = i
  previewVisible.value = true
}

const hasApi = (methodPath) => {
  if (!window.electronAPI) return false
  const parts = methodPath.split('.')
  let obj = window.electronAPI
  for (const p of parts) {
    if (!obj || obj[p] === undefined) return false
    obj = obj[p]
  }
  return typeof obj === 'function'
}

const batchDelete = async () => {
  if (!hasApi('media.delete')) {
    Message.error('删除功能不可用')
    return
  }
  try {
    for (const id of selectedIds.value) {
      await window.electronAPI.media.delete(id)
    }
    Message.success(`已删除 ${selectedIds.value.length} 个文件`)
    clearSelection()
    await loadMedia()
  } catch (e) {
    console.error('批量删除失败:', e)
    Message.error('删除失败：' + (e.message || '未知错误'))
  }
}

const toggleFav = async () => {
  if (!hasApi('media.bulkUpdate')) {
    Message.error('收藏功能不可用')
    return
  }
  try {
    const fav = allFav.value ? 0 : 1
    await window.electronAPI.media.bulkUpdate(selectedIds.value, { is_favorite: fav })
    Message.success(`已${fav ? '收藏' : '取消收藏'} ${selectedIds.value.length} 个文件`)
    await loadMedia()
  } catch (e) {
    console.error('收藏切换失败:', e)
    Message.error('操作失败：' + (e.message || '未知错误'))
  }
}

const batchTag = async () => {
  try {
    if (!hasApi('media.update')) {
      Message.error('标签功能不可用')
      return
    }
    const input = prompt('请输入要添加的标签，用逗号分隔：')
    if (!input) return
    const newTags = input.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    const items = (media.value || []).filter(m => selectedIds.value.includes(m.id))
    for (const m of items) {
      try {
        const t = [...new Set([...parseTags(m.tags), ...newTags])]
        await window.electronAPI.media.update(m.id, { tags: t })
      } catch (e) {
        console.warn('更新标签失败:', m.id, e.message)
      }
    }
    Message.success('标签已添加')
    await loadMedia()
  } catch (e) {
    console.error('批量添加标签失败:', e)
    Message.error('操作失败：' + (e.message || '未知错误'))
  }
}

const onImportSuccess = async () => {
  try {
    await loadMedia()
    await loadTags()
  } catch (e) {
    console.error('导入后刷新失败:', e)
  }
}

const loadMedia = async () => {
  if (!hasApi('media.list')) {
    media.value = []
    return
  }
  try {
    media.value = await window.electronAPI.media.list({}) || []
  } catch (e) {
    console.error('加载媒体列表失败:', e)
    media.value = []
    Message.error('加载媒体失败')
  }
}

const loadTags = async () => {
  if (!hasApi('tags.list')) {
    allTags.value = []
    return
  }
  try {
    allTags.value = await window.electronAPI.tags.list() || []
  } catch (e) {
    console.error('加载标签列表失败:', e)
    allTags.value = []
  }
}

const loadTravels = async () => {
  if (!hasApi('travel.list')) {
    travels.value = []
    return
  }
  try {
    travels.value = await window.electronAPI.travel.list() || []
  } catch (e) {
    console.error('加载旅行列表失败:', e)
    travels.value = []
  }
}

onMounted(async () => {
  try {
    await loadMedia()
    await loadTags()
    await loadTravels()
  } catch (e) {
    console.error('媒体库初始化失败:', e)
  }
})
</script>

<style lang="less" scoped>
.media-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    .section-title { margin: 0; }
  }
  .header-actions { display: flex; gap: 8px; }

  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    background: #fff;
    border: 1px solid #f0ebe3;
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 12px;
    flex-wrap: wrap;

    .filter-left, .filter-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .count-text {
      font-size: 12px;
      color: #a88a5c;
      font-weight: 500;
    }
  }

  .batch-bar {
    background: linear-gradient(135deg, #e3f2f9, #f0ebe3);
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .content-area {
    min-height: 400px;
  }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 12px;
  }

  .timeline-view {
    .tl-group {
      margin-bottom: 28px;
      display: flex;
      gap: 20px;
    }

    .tl-date-block {
      width: 100px;
      flex-shrink: 0;
      padding-top: 6px;

      .tl-date {
        font-size: 16px;
        font-weight: 700;
        color: #5a9fc4;
        letter-spacing: -0.5px;
      }
      .tl-count {
        font-size: 11px;
        color: #a88a5c;
        margin-top: 4px;
        background: #f5efe0;
        padding: 2px 8px;
        border-radius: 10px;
        display: inline-block;
      }
    }

    .tl-items {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 12px;
    }
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: #8a8a8a;

    .empty-icon { opacity: 0.9; margin-bottom: 20px; }
    h3 { font-size: 18px; color: #4a4a4a; margin: 0 0 8px; }
    p { font-size: 13px; margin: 0 0 24px; }
  }
}
</style>
