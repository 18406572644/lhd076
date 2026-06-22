<template>
  <div class="page-container albums-page">
    <div class="page-header">
      <h2 class="section-title">我的相册</h2>
      <div class="header-actions">
        <a-input-search v-model="search" placeholder="搜索相册..." size="small" style="width: 220px" allow-clear />
        <a-button type="primary" :icon="iconPlus" @click="formVisible = true">创建相册</a-button>
      </div>
    </div>

    <div v-if="filteredAlbums.length" class="albums-grid">
      <div
        v-for="a in filteredAlbums"
        :key="a.id"
        class="album-card tm-card-hover"
        @click="goDetail(a.id)"
      >
        <div class="album-cover" :style="getCoverStyle(a)">
          <div class="cover-overlay"></div>
          <div class="cover-inner" v-if="!a.cover_image">
            <icon-file-image :size="36" />
          </div>
          <div class="album-stats">
            <span><icon-image :size="12" /> {{ a.media_count || 0 }} 张</span>
          </div>
        </div>
        <div class="album-body">
          <div class="album-head">
            <div class="album-title">{{ a.title }}</div>
            <div class="album-menu" @click.stop>
              <a-dropdown>
                <a-button type="text" size="mini" shape="circle"><icon-more /></a-button>
                <template #content>
                  <a-doption @click="editAlbum(a)"><icon-edit :size="12" /> 编辑</a-doption>
                  <a-doption @click="exportAlbum(a)"><icon-upload :size="12" /> 导出</a-doption>
                  <a-doption status="danger" @click="removeAlbum(a)">
                    <icon-delete :size="12" /> 删除
                  </a-doption>
                </template>
              </a-dropdown>
            </div>
          </div>
          <div class="album-travel" v-if="a.travel_title">
            <icon-camera :size="11" /> {{ a.travel_title }}
          </div>
          <div class="album-desc" v-if="a.description">
            {{ a.description.length > 45 ? a.description.slice(0, 45) + '...' : a.description }}
          </div>
          <div class="album-time">{{ formatDate(a.created_at) }} 创建</div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 200 180" width="160" height="144">
          <defs>
            <linearGradient id="as1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#e3f2f9"/>
              <stop offset="100%" style="stop-color:#d4ebf7"/>
            </linearGradient>
          </defs>
          <rect x="30" y="40" width="56" height="100" rx="6" fill="url(#as1)" stroke="#7eb8da" stroke-width="1.5"/>
          <rect x="58" y="32" width="110" height="108" rx="8" fill="#fff" stroke="#7eb8da" stroke-width="1.5"/>
          <rect x="72" y="48" width="82" height="56" rx="4" fill="#f5efe0"/>
          <circle cx="113" cy="76" r="14" fill="#a8d8ea" opacity="0.5"/>
          <path d="M72 88 L92 70 L102 80 L120 62 L154 92 L154 100 L72 100 Z" fill="#c4a77d" opacity="0.3"/>
          <rect x="72" y="112" width="82" height="6" rx="3" fill="#e8e0d4"/>
          <rect x="72" y="124" width="56" height="6" rx="3" fill="#f0ebe3"/>
        </svg>
      </div>
      <h3>还没有相册</h3>
      <p>创建相册来整理和分类你的旅行照片</p>
      <a-button type="primary" :icon="iconPlus" size="large" @click="formVisible = true">
        创建第一个相册
      </a-button>
    </div>

    <AlbumFormModal v-model="formVisible" :album="currentAlbum" @success="loadAlbums" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconPlus,
  IconFileImage,
  IconImage,
  IconCamera,
  IconMore,
  IconEdit,
  IconUpload,
  IconDelete
} from '@arco-design/web-vue/es/icon'
import AlbumFormModal from '@/components/AlbumFormModal.vue'
import { formatDate } from '@/utils'

const router = useRouter()
const api = window.electronAPI

const iconPlus = IconPlus
const iconPicture = IconFileImage
const iconImage = IconImage
const iconCamera = IconCamera
const iconMore = IconMore
const iconEdit = IconEdit
const iconUpload = IconUpload
const iconDelete = IconDelete

const albums = ref([])
const search = ref('')
const formVisible = ref(false)
const currentAlbum = ref(null)

const filteredAlbums = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return albums.value
  return albums.value.filter(a =>
    a.title.toLowerCase().includes(q) ||
    (a.description && a.description.toLowerCase().includes(q)) ||
    (a.travel_title && a.travel_title.toLowerCase().includes(q))
  )
})

const getCoverStyle = (a) => {
  if (a.cover_image) {
    return { backgroundImage: `url(file:///${a.cover_image.replace(/\\/g, '/')})` }
  }
  return {}
}

const goDetail = (id) => router.push(`/albums/${id}`)

const editAlbum = (a) => {
  currentAlbum.value = a
  formVisible.value = true
}

const exportAlbum = async (a) => {
  Message.info('请进入相册详情页进行导出操作')
}

const removeAlbum = async (a) => {
  try {
    await api.album.delete(a.id)
    Message.success('已删除')
    await loadAlbums()
  } catch (e) {
    Message.error('删除失败')
  }
}

const loadAlbums = async () => {
  albums.value = await api.album.list()
}

onMounted(loadAlbums)
</script>

<style lang="less" scoped>
.albums-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    .section-title { margin: 0; }
  }
  .header-actions { display: flex; gap: 10px; }

  .albums-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  .album-card {
    background: #fff;
    border: 1px solid #f0ebe3;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }

  .album-cover {
    height: 200px;
    background: linear-gradient(135deg, #a8d8ea, #7eb8da);
    background-size: cover;
    background-position: center;
    position: relative;

    .cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.35));
    }

    .cover-inner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.85);
    }

    .album-stats {
      position: absolute;
      bottom: 10px;
      left: 12px;
      background: rgba(0,0,0,0.4);
      color: #fff;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
  }

  .album-body {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .album-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;
  }

  .album-title {
    font-size: 16px;
    font-weight: 600;
    color: #4a4a4a;
    line-height: 1.3;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .album-travel {
    font-size: 11px;
    color: #7eb8da;
    margin-bottom: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #e3f2f9;
    padding: 2px 8px;
    border-radius: 10px;
    width: fit-content;
  }

  .album-desc {
    font-size: 12px;
    color: #a0a0a0;
    line-height: 1.5;
    flex: 1;
    margin-bottom: 8px;
  }

  .album-time {
    font-size: 11px;
    color: #c0b8a8;
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
