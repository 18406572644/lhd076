<template>
  <div class="page-container album-detail" v-if="album">
    <div class="detail-header">
      <a-button type="text" :icon="iconBack" @click="$router.back()" class="back-btn">
        返回
      </a-button>
      <div class="header-content">
        <div class="album-header">
          <div class="album-cover" :style="coverStyle">
            <div class="cover-inner" v-if="!album.cover_image">
              <icon-file-image :size="32" />
            </div>
          </div>
          <div class="album-info">
            <h1 class="album-title">{{ album.title }}</h1>
            <div class="album-meta">
              <span v-if="album.travel_title">
                <icon-camera :size="12" /> {{ album.travel_title }}
              </span>
              <span><icon-image :size="12" /> {{ album.media_count || 0 }} 张照片</span>
              <span><icon-calendar :size="12" /> {{ formatDate(album.created_at) }} 创建</span>
            </div>
            <div class="album-desc" v-if="album.description">
              {{ album.description }}
            </div>
            <div class="album-actions">
              <a-button size="small" :icon="iconUpload" @click="importVisible = true">添加照片</a-button>
              <a-button size="small" :icon="iconEdit" @click="formVisible = true">编辑</a-button>
              <a-button size="small" type="outline" :icon="iconBook" @click="createPhotoBook">
                制作照片书
              </a-button>
              <a-button size="small" type="outline" :icon="iconDownload" @click="exportAs('html')">
                导出 HTML
              </a-button>
              <a-button size="small" type="outline" :icon="iconFile" @click="exportAs('pdf')">
                导出 PDF
              </a-button>
              <a-button size="small" type="outline" @click="exportImages" :icon="iconDownload">
                下载原图
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-divider style="margin: 20px 0 16px" />

    <div class="toolbar">
      <div class="toolbar-left">
        <span class="count-badge">{{ mediaList.length }} 张照片</span>
        <a-checkbox
          v-if="mediaList.length"
          :model-value="isAllSelected"
          @change="toggleAll"
          style="margin-left: 12px"
        >全选</a-checkbox>
      </div>
      <div class="toolbar-right">
        <a-button size="small" type="outline" :disabled="!selectedIds.length" @click="removeFromAlbum">
          移出相册 {{ selectedIds.length ? `(${selectedIds.length})` : '' }}
        </a-button>
      </div>
    </div>

    <div class="media-grid selectable" v-if="mediaList.length">
      <MediaCard
        v-for="m in mediaList"
        :key="m.id"
        :media="m"
        :selectable="true"
        :selected="selectedIds.includes(m.id)"
        @click="openPreview(m, mediaList.indexOf(m))"
        @select="(sel) => toggleSelect(m.id, sel)"
      />
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 200 160" width="140" height="112">
          <rect x="40" y="30" width="120" height="100" rx="8" fill="#f5efe0" stroke="#c4a77d" stroke-width="1.5" stroke-dasharray="5,4"/>
          <circle cx="100" cy="80" r="22" fill="#fff" stroke="#a8d8ea" stroke-width="2"/>
          <path d="M58 98 L78 78 L88 88 L110 66 L142 98 V120 L58 120 Z" fill="#8bc9a0" opacity="0.4"/>
        </svg>
      </div>
      <h3>相册里还没有照片</h3>
      <p>从媒体库添加或直接导入新照片吧</p>
      <a-button type="primary" :icon="iconUpload" @click="importVisible = true">
        导入照片
      </a-button>
    </div>

    <ImportModal v-model="importVisible" @success="afterImport" />
    <AlbumFormModal v-model="formVisible" :album="album" @success="loadAlbum" />
    <MediaPreview
      v-model="previewVisible"
      :media="currentMedia"
      :mediaList="mediaList"
      :currentIndex="previewIndex"
      @change="(i) => previewIndex = i"
      @delete="loadMedia"
    />

    <PhotoBookEditor
      v-if="photoBookEditorVisible"
      :album-id="albumId"
      :initial-photos="mediaList"
      template-type="a4_hardcover"
      @close="photoBookEditorVisible = false"
      @saved="loadAlbum"
    />
  </div>
  <a-empty v-else />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconBackward,
  IconFileImage,
  IconImage,
  IconCamera,
  IconCalendar,
  IconUpload,
  IconEdit,
  IconDownload,
  IconFile,
  IconBook
} from '@arco-design/web-vue/es/icon'
import MediaCard from '@/components/MediaCard.vue'
import MediaPreview from '@/components/MediaPreview.vue'
import ImportModal from '@/components/ImportModal.vue'
import AlbumFormModal from '@/components/AlbumFormModal.vue'
import PhotoBookEditor from '@/components/PhotoBookEditor.vue'
import { formatDate } from '@/utils'

const route = useRoute()
const api = window.electronAPI

const iconBack = IconBackward
const iconPicture = IconFileImage
const iconImage = IconImage
const iconCamera = IconCamera
const iconCalendar = IconCalendar
const iconUpload = IconUpload
const iconEdit = IconEdit
const iconDownload = IconDownload
const iconFile = IconFile
const iconBook = IconBook

const albumId = computed(() => +route.params.id)
const album = ref(null)
const mediaList = ref([])
const selectedIds = ref([])
const importVisible = ref(false)
const formVisible = ref(false)
const previewVisible = ref(false)
const previewIndex = ref(0)
const photoBookEditorVisible = ref(false)

const currentMedia = computed(() => mediaList.value[previewIndex.value] || null)

const coverStyle = computed(() => {
  const cover = album.value?.cover_image || mediaList.value[0]?.file_path
  if (cover) {
    return { backgroundImage: `url(file:///${cover.replace(/\\/g, '/')})` }
  }
  return {}
})

const isAllSelected = computed(() => {
  if (!mediaList.value.length) return false
  return mediaList.value.every(m => selectedIds.value.includes(m.id))
})

const toggleSelect = (id, sel) => {
  if (sel) {
    if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
  } else {
    selectedIds.value = selectedIds.value.filter(x => x !== id)
  }
}

const toggleAll = (val) => {
  selectedIds.value = val ? mediaList.value.map(m => m.id) : []
}

const openPreview = (m, i) => {
  previewIndex.value = i
  previewVisible.value = true
}

const removeFromAlbum = async () => {
  for (const id of selectedIds.value) {
    await api.media.removeFromAlbum(id, albumId.value)
  }
  Message.success(`已从相册移除 ${selectedIds.value.length} 张`)
  selectedIds.value = []
  await loadMedia()
  await loadAlbum()
}

const afterImport = async (ids) => {
  if (ids && ids.length) {
    for (const id of ids) {
      try { await api.media.addToAlbum(id, albumId.value) } catch (e) {}
    }
  }
  await loadMedia()
  await loadAlbum()
}

const exportImages = async () => {
  if (!mediaList.value.length) {
    Message.warning('相册中没有照片')
    return
  }
  const result = await api.selectFolder()
  if (result.canceled || !result.filePaths?.length) return
  const folder = result.filePaths[0]
  let done = 0
  for (let i = 0; i < mediaList.value.length; i++) {
    const m = mediaList.value[i]
    try {
      const dest = `${folder}\\${m.original_name || m.file_name}`
      await api.copyFile(m.file_path, dest)
      done++
    } catch (e) {
      console.error(e)
    }
  }
  Message.success(`已导出 ${done} 个文件`)
}

const exportAs = async (type) => {
  Message.info(`${type.toUpperCase()} 导出功能：请前往"旅行报告"页面使用完整导出功能`)
}

const createPhotoBook = () => {
  if (!mediaList.value.length) {
    Message.warning('相册中还没有照片，请先添加照片')
    return
  }
  photoBookEditorVisible.value = true
}

const loadAlbum = async () => {
  album.value = await api.album.get(albumId.value)
}

const loadMedia = async () => {
  mediaList.value = await api.media.getByAlbum(albumId.value)
  selectedIds.value = []
}

onMounted(async () => {
  await loadAlbum()
  await loadMedia()
})

watch(albumId, () => {
  loadAlbum()
  loadMedia()
})
</script>

<style lang="less" scoped>
.album-detail {
  padding-top: 0;

  .detail-header {
    padding: 16px 0 0;
  }

  .back-btn {
    margin-bottom: 12px;
  }

  .album-header {
    display: flex;
    gap: 24px;
  }

  .album-cover {
    width: 220px;
    height: 160px;
    border-radius: 14px;
    background: linear-gradient(135deg, #a8d8ea, #7eb8da);
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
    overflow: hidden;
    box-shadow: 0 6px 18px rgba(126, 184, 218, 0.25);

    .cover-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.9);
    }
  }

  .album-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .album-title {
    font-size: 26px;
    font-weight: 700;
    color: #4a4a4a;
    margin: 0 0 10px;
  }

  .album-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 10px;
    font-size: 12px;
    color: #8a8a8a;

    span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  .album-desc {
    font-size: 13px;
    color: #6a6a6a;
    line-height: 1.6;
    margin-bottom: 12px;
  }

  .album-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding: 8px 12px;
    background: #fff;
    border-radius: 10px;
    border: 1px solid #f0ebe3;
  }

  .count-badge {
    background: #e3f2f9;
    color: #5a9fc4;
    padding: 4px 12px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 600;
  }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 12px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #8a8a8a;

    .empty-icon { opacity: 0.8; margin-bottom: 16px; }
    h3 { font-size: 17px; color: #4a4a4a; margin: 0 0 8px; }
    p { font-size: 13px; margin: 0 0 20px; }
  }
}
</style>
