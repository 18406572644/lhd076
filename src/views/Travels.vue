<template>
  <div class="page-container travels-page">
    <div class="page-header">
      <h2 class="section-title">所有旅行</h2>
      <div class="header-actions">
        <a-input-search
          v-model="search"
          placeholder="搜索旅行..."
          style="width: 240px"
          allow-clear
        />
        <a-button type="primary" :icon="iconPlus" @click="formVisible = true">
          新建旅行
        </a-button>
        <a-button :icon="iconUpload" @click="importVisible = true">导入媒体</a-button>
      </div>
    </div>

    <div class="travels-grid" v-if="filteredTravels.length">
      <div
        v-for="t in filteredTravels"
        :key="t.id"
        class="travel-card tm-card-hover"
        @click="goDetail(t.id)"
      >
        <div class="card-cover" :style="getCoverStyle(t)">
          <div class="cover-mask"></div>
          <div class="cover-inner" v-if="!t.cover_image">
            <icon-camera :size="36" />
          </div>
          <div class="card-stats">
            <span><icon-image :size="12" /> {{ t.media_count || 0 }}</span>
            <span><icon-file-image :size="12" /> {{ t.album_count || 0 }}</span>
            <span v-if="isFav(t)"><icon-star-fill :size="12" /></span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">{{ t.title }}</div>
          <div class="card-meta">
            <span v-if="t.location" class="meta-item">
              <icon-location :size="11" /> {{ t.location }}
            </span>
            <span v-if="t.start_date" class="meta-item">
              <icon-calendar :size="11" />
              {{ formatDate(t.start_date) }} ~ {{ formatDate(t.end_date || t.start_date) }}
            </span>
          </div>
          <div class="card-tags" v-if="parseTags(t.tags).length">
            <a-tag v-for="tag in parseTags(t.tags).slice(0, 3)" :key="tag" size="small" color="blue">
              {{ tag }}
            </a-tag>
          </div>
          <div class="card-desc" v-if="t.description">
            {{ t.description.length > 60 ? t.description.slice(0, 60) + '...' : t.description }}
          </div>
          <div class="card-actions" @click.stop>
            <a-button size="mini" type="text" @click="editTravel(t)">
              <icon-edit :size="13" /> 编辑
            </a-button>
            <a-button size="mini" type="text" @click="importToTravel(t)">
              <icon-upload :size="13" /> 导入
            </a-button>
            <a-popconfirm content="删除此旅行？" position="br" @ok="deleteTravel(t)">
              <a-button size="mini" type="text" status="danger">
                <icon-delete :size="13" />
              </a-button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-deco">
        <svg viewBox="0 0 200 180" width="160" height="144">
          <defs>
            <linearGradient id="es1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#e3f2f9"/>
              <stop offset="100%" style="stop-color:#a8d8ea"/>
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="60" fill="url(#es1)"/>
          <path d="M65 95 L85 115 L135 65" stroke="#7eb8da" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="65" cy="95" r="5" fill="#c4a77d"/>
          <circle cx="85" cy="115" r="5" fill="#c4a77d"/>
          <circle cx="135" cy="65" r="5" fill="#c4a77d"/>
        </svg>
      </div>
      <h3>还没有旅行记录</h3>
      <p>创建你的第一次旅行，开始记录美好回忆</p>
      <a-button type="primary" size="large" :icon="iconPlus" @click="formVisible = true">
        创建第一次旅行
      </a-button>
    </div>

    <TravelFormModal v-model="formVisible" :travel="currentTravel" @success="loadTravels" />
    <ImportModal v-model="importVisible" :defaultTravelId="selectedTravelId" @success="loadTravels" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconPlus,
  IconUpload,
  IconCamera,
  IconImage,
  IconFileImage,
  IconLocation,
  IconCalendar,
  IconStarFill,
  IconEdit,
  IconDelete
} from '@arco-design/web-vue/es/icon'
import TravelFormModal from '@/components/TravelFormModal.vue'
import ImportModal from '@/components/ImportModal.vue'
import { formatDate, parseTags } from '@/utils'
import { useTravelStore } from '@/stores/travel'

const router = useRouter()
const travelStore = useTravelStore()

const iconPlus = IconPlus
const iconUpload = IconUpload
const iconCamera = IconCamera
const iconImage = IconImage
const iconPicture = IconFileImage
const iconLocation = IconLocation
const iconCalendar = IconCalendar
const iconStarFill = IconStarFill
const iconEdit = IconEdit
const iconDelete = IconDelete

const travels = computed(() => travelStore.travels)
const search = ref('')
const formVisible = ref(false)
const importVisible = ref(false)
const currentTravel = ref(null)
const selectedTravelId = ref(null)

const filteredTravels = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return travels.value
  return travels.value.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.location && t.location.toLowerCase().includes(q)) ||
    (t.tags && t.tags.toLowerCase().includes(q))
  )
})

const isFav = (t) => parseTags(t.tags).includes('收藏')

const getCoverStyle = (t) => {
  if (t.cover_image) {
    return { backgroundImage: `url(file:///${t.cover_image.replace(/\\/g, '/')})` }
  }
  return {}
}

const goDetail = (id) => {
  router.push(`/travels/${id}`)
}

const editTravel = (t) => {
  currentTravel.value = t
  formVisible.value = true
}

const importToTravel = (t) => {
  selectedTravelId.value = t.id
  importVisible.value = true
}

const deleteTravel = async (t) => {
  try {
    await travelStore.deleteTravel(t.id)
    Message.success('已删除')
  } catch (e) {
    Message.error('删除失败')
  }
}

const loadTravels = async () => {
  await travelStore.fetchTravels()
}

onMounted(loadTravels)
</script>

<style lang="less" scoped>
.travels-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .header-actions {
    display: flex;
    gap: 10px;
  }
  .section-title {
    margin: 0;
  }

  .travels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .travel-card {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid #f0ebe3;
    display: flex;
    flex-direction: column;
  }

  .card-cover {
    height: 180px;
    position: relative;
    background: linear-gradient(135deg, #a8d8ea 0%, #7eb8da 100%);
    background-size: cover;
    background-position: center;

    .cover-mask {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4));
    }

    .cover-inner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.9);
    }

    .card-stats {
      position: absolute;
      bottom: 10px;
      left: 12px;
      display: flex;
      gap: 12px;
      color: #fff;
      font-size: 12px;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4);

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(0,0,0,0.25);
        padding: 2px 8px;
        border-radius: 10px;
      }
    }
  }

  .card-body {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #4a4a4a;
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;

    .meta-item {
      font-size: 12px;
      color: #8a8a8a;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  .card-tags {
    margin-bottom: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .card-desc {
    font-size: 12px;
    color: #a0a0a0;
    line-height: 1.6;
    flex: 1;
  }

  .card-actions {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed #f0ebe3;
    display: flex;
    gap: 4px;
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: #8a8a8a;

    .empty-deco {
      opacity: 0.8;
      margin-bottom: 20px;
    }

    h3 {
      font-size: 18px;
      color: #4a4a4a;
      margin: 0 0 8px;
    }

    p {
      font-size: 13px;
      margin: 0 0 24px;
    }
  }
}
</style>
