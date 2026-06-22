<template>
  <div class="page-container">
    <div class="welcome-section" v-if="stats.travels === 0">
      <div class="welcome-content">
        <div class="welcome-deco">
          <svg viewBox="0 0 200 160" width="180" height="144">
            <defs>
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#e3f2f9"/>
                <stop offset="100%" style="stop-color:#a8d8ea"/>
              </linearGradient>
              <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#c4a77d"/>
                <stop offset="100%" style="stop-color:#a88a5c"/>
              </linearGradient>
            </defs>
            <rect width="200" height="120" fill="url(#skyGrad)" rx="12"/>
            <circle cx="160" cy="36" r="18" fill="#fdf3df" opacity="0.8"/>
            <path d="M20 120 L70 60 L100 90 L140 40 L180 120 Z" fill="url(#mountainGrad)"/>
            <path d="M20 120 L70 75 L85 95 L100 80 L180 120 Z" fill="#dcc9a8" opacity="0.7"/>
            <rect y="120" width="200" height="40" fill="#e8e0d4" rx="0 0 12 12"/>
            <ellipse cx="50" cy="138" rx="20" ry="4" fill="#8bc9a0" opacity="0.5"/>
            <ellipse cx="140" cy="142" rx="26" ry="4" fill="#8bc9a0" opacity="0.5"/>
            <path d="M120 28 Q125 20 135 22 Q135 30 125 30 Q118 30 120 28" fill="#fff" opacity="0.9"/>
            <path d="M60 40 Q70 34 82 36 Q82 44 72 44 Q62 44 60 40" fill="#fff" opacity="0.9"/>
          </svg>
        </div>
        <h1 class="welcome-title">开启你的旅行记忆之旅</h1>
        <p class="welcome-desc">记录每一次远行，珍藏每一份感动，让照片与故事永远留存</p>
        <div class="welcome-actions">
          <a-button type="primary" size="large" @click="importVisible = true" :icon="iconUpload">
            导入第一张照片
          </a-button>
          <a-button size="large" @click="createTravelVisible = true" :icon="iconCamera">
            创建第一次旅行
          </a-button>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="stats-row">
        <StatCard label="旅行次数" :value="stats.travels" :icon="iconCamera" color="blue" :sub-label="travelsSub" />
        <StatCard label="照片数量" :value="stats.photos" :icon="iconImage" color="green" :sub-label="photosSub" />
        <StatCard label="视频数量" :value="stats.videos" :icon="iconPlay" color="pink" />
        <StatCard label="相册数量" :value="stats.albums" :icon="iconPicture" color="brown" />
        <StatCard label="足迹地点" :value="stats.locations" :icon="iconLocation" color="purple" />
        <StatCard label="累计花费" :value="expenseText" :icon="iconWallet" color="yellow" />
      </div>

      <div class="content-grid">
        <div class="left-col">
          <a-card class="panel-card" :bordered="false" :title="'最近旅行'">
            <template #extra>
              <a-link @click="$router.push('/travels')">查看全部</a-link>
            </template>
            <div class="recent-travels" v-if="recentTravels.length">
              <div
                v-for="t in recentTravels"
                :key="t.id"
                class="travel-item"
                @click="$router.push(`/travels/${t.id}`)"
              >
                <div class="travel-cover" :style="getCoverStyle(t)">
                  <div class="cover-placeholder" v-if="!t.cover_image">
                    <icon-camera :size="24" />
                  </div>
                </div>
                <div class="travel-info">
                  <div class="travel-title">{{ t.title }}</div>
                  <div class="travel-meta">
                    <span v-if="t.location"><icon-location :size="11" /> {{ t.location }}</span>
                    <span v-if="t.start_date"><icon-calendar :size="11" /> {{ formatDate(t.start_date) }}</span>
                  </div>
                  <div class="travel-stats">
                    <span><icon-image :size="12" /> {{ t.media_count || 0 }} 张</span>
                    <span><icon-file-image :size="12" /> {{ t.album_count || 0 }} 相册</span>
                  </div>
                </div>
              </div>
            </div>
            <a-empty v-else description="暂无旅行记录" />
          </a-card>

          <a-card class="panel-card" :bordered="false" :title="'最新照片'" style="margin-top: 20px;">
            <template #extra>
              <a-link @click="$router.push('/media')">查看全部</a-link>
            </template>
            <div class="recent-media" v-if="recentMedia.length">
              <MediaCard
                v-for="m in recentMedia"
                :key="m.id"
                :media="m"
                @click="openMediaPreview(m)"
              />
            </div>
            <a-empty v-else description="暂无照片" />
          </a-card>
        </div>

        <div class="right-col">
          <a-card class="panel-card" :bordered="false" :title="'年度时间轴'">
            <div class="year-selector">
              <a-radio-group type="button" v-model="selectedYear" size="small">
                <a-radio v-for="y in availableYears" :key="y" :value="y">{{ y }}年</a-radio>
              </a-radio-group>
            </div>
            <div class="mini-timeline">
              <div
                v-for="(point, idx) in timelinePoints"
                :key="idx"
                class="tl-point"
                :style="{ left: point.x + '%', height: point.height + '%' }"
                :title="`${point.month}: ${point.count}个文件`"
              >
                <div class="tl-bar" :class="point.type"></div>
                <div class="tl-month">{{ point.shortMonth }}</div>
              </div>
            </div>
            <div class="timeline-legend">
              <span class="legend-item"><i class="dot image"></i> 照片</span>
              <span class="legend-item"><i class="dot video"></i> 视频</span>
            </div>
          </a-card>

          <a-card class="panel-card" :bordered="false" :title="'快捷操作'" style="margin-top: 20px;">
            <div class="quick-actions">
              <div class="action-item" @click="importVisible = true">
                <div class="action-icon blue"><icon-upload :size="20" /></div>
                <span>导入媒体</span>
              </div>
              <div class="action-item" @click="createTravelVisible = true">
                <div class="action-icon brown"><icon-plus :size="20" /></div>
                <span>新建旅行</span>
              </div>
              <div class="action-item" @click="$router.push('/timeline')">
                <div class="action-icon green"><icon-calendar :size="20" /></div>
                <span>时间轴</span>
              </div>
              <div class="action-item" @click="$router.push('/map')">
                <div class="action-icon purple"><icon-location :size="20" /></div>
                <span>足迹地图</span>
              </div>
              <div class="action-item" @click="$router.push('/tools')">
                <div class="action-icon pink"><icon-tool :size="20" /></div>
                <span>照片工具</span>
              </div>
              <div class="action-item" @click="$router.push('/report')">
                <div class="action-icon yellow"><icon-file :size="20" /></div>
                <span>生成报告</span>
              </div>
            </div>
          </a-card>
        </div>
      </div>
    </template>

    <ImportModal v-model="importVisible" @success="onImportSuccess" />
    <TravelFormModal v-model="createTravelVisible" @success="loadData" />
    <MediaPreview v-model="previewVisible" :media="currentMedia" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IconCamera,
  IconImage,
  IconPlayCircle,
  IconFileImage,
  IconLocation,
  IconCalendar,
  IconUpload,
  IconBook,
  IconPlus,
  IconTool,
  IconFile
} from '@arco-design/web-vue/es/icon'
import StatCard from '@/components/StatCard.vue'
import MediaCard from '@/components/MediaCard.vue'
import ImportModal from '@/components/ImportModal.vue'
import TravelFormModal from '@/components/TravelFormModal.vue'
import MediaPreview from '@/components/MediaPreview.vue'
import { formatDate, formatFileSize } from '@/utils'

const iconCamera = IconCamera
const iconImage = IconImage
const iconPlay = IconPlayCircle
const iconPicture = IconFileImage
const iconLocation = IconLocation
const iconCalendar = IconCalendar
const iconUpload = IconUpload
const iconWallet = IconBook
const iconPlus = IconPlus
const iconTool = IconTool
const iconFile = IconFile

const api = window.electronAPI

const stats = ref({ travels: 0, albums: 0, photos: 0, videos: 0, totalSize: 0, expenseTotal: 0, locations: 0 })
const recentTravels = ref([])
const recentMedia = ref([])
const timelineData = ref([])
const selectedYear = ref(new Date().getFullYear())
const importVisible = ref(false)
const createTravelVisible = ref(false)
const previewVisible = ref(false)
const currentMedia = ref(null)

const availableYears = computed(() => {
  const years = new Set()
  years.add(new Date().getFullYear())
  for (const d of timelineData.value) {
    if (d.month) years.add(parseInt(d.month.split('-')[0]))
  }
  return Array.from(years).sort((a, b) => b - a)
})

const expenseText = computed(() => '¥' + Number(stats.value.expenseTotal || 0).toFixed(0))
const travelsSub = computed(() => `累计 ${stats.value.travels} 次远行`)
const photosSub = computed(() => formatFileSize(stats.value.totalSize))

const timelinePoints = computed(() => {
  const points = []
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12']
  const shortMonths = ['1','2','3','4','5','6','7','8','9','10','11','12']
  const maxCount = Math.max(...timelineData.value.filter(d => d.month?.startsWith(selectedYear.value)).map(d => d.count), 1)

  for (let i = 0; i < 12; i++) {
    const month = `${selectedYear.value}-${months[i]}`
    const items = timelineData.value.filter(d => d.month === month)
    const count = items.reduce((s, d) => s + d.count, 0)
    const image = items.find(d => d.file_type === 'image')?.count || 0
    const video = items.find(d => d.file_type === 'video')?.count || 0
    points.push({
      month: months[i],
      shortMonth: shortMonths[i],
      count,
      image,
      video,
      type: count > 0 ? (video > image ? 'video' : 'image') : 'empty',
      x: (i / 11) * 100,
      height: count > 0 ? Math.max(8, (count / maxCount) * 85) : 2
    })
  }
  return points
})

const getCoverStyle = (t) => {
  if (t.cover_image) {
    return { backgroundImage: `url(file:///${t.cover_image.replace(/\\/g, '/')})` }
  }
  return {}
}

const openMediaPreview = (m) => {
  currentMedia.value = m
  previewVisible.value = true
}

const onImportSuccess = () => {
  loadData()
}

const loadData = async () => {
  try {
    stats.value = await api.stats.overview()
    const travels = await api.travel.list()
    recentTravels.value = travels.slice(0, 4)
    recentMedia.value = await api.media.list({ limit: 8 })
    timelineData.value = await api.stats.timeline()
    if (!availableYears.value.includes(selectedYear.value)) {
      selectedYear.value = availableYears.value[0]
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadData)
</script>

<style lang="less" scoped>
.welcome-section {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  max-width: 520px;
}

.welcome-deco {
  margin-bottom: 24px;
  opacity: 0.95;
}

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  color: #4a4a4a;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #5a9fc4, #c4a77d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-desc {
  font-size: 14px;
  color: #8a8a8a;
  line-height: 1.7;
  margin-bottom: 28px;
}

.welcome-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
}

.panel-card {
  border-radius: 16px !important;
}

.recent-travels {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.travel-item {
  display: flex;
  gap: 14px;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #faf6f0;
  }
}

.travel-cover {
  width: 96px;
  height: 72px;
  border-radius: 8px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #a8d8ea, #7eb8da);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.cover-placeholder {
  opacity: 0.9;
}

.travel-info {
  flex: 1;
  min-width: 0;
}

.travel-title {
  font-size: 14px;
  font-weight: 600;
  color: #4a4a4a;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.travel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: #8a8a8a;
  margin-bottom: 6px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
}

.travel-stats {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #7eb8da;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.recent-media {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.year-selector {
  margin-bottom: 16px;
}

.mini-timeline {
  position: relative;
  height: 140px;
  display: flex;
  align-items: flex-end;
  padding: 0 8px;
}

.tl-point {
  position: absolute;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}

.tl-bar {
  width: 14px;
  height: 100%;
  border-radius: 7px 7px 0 0;
  transition: all 0.3s ease;

  &.image {
    background: linear-gradient(180deg, #8bc9a0, #6ab384);
  }
  &.video {
    background: linear-gradient(180deg, #e8a5b9, #d1879f);
  }
  &.empty {
    background: #f0ebe3;
  }
}

.tl-month {
  position: absolute;
  bottom: -18px;
  font-size: 10px;
  color: #b0b0b0;
}

.timeline-legend {
  display: flex;
  gap: 16px;
  margin-top: 28px;
  justify-content: center;
  font-size: 11px;
  color: #8a8a8a;

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    display: inline-block;
    &.image { background: #8bc9a0; }
    &.video { background: #e8a5b9; }
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  color: #6a5a48;

  &:hover {
    background: #faf6f0;
    transform: translateY(-2px);
  }
}

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;

  &.blue { background: linear-gradient(135deg, #a8d8ea, #7eb8da); }
  &.brown { background: linear-gradient(135deg, #dcc9a8, #c4a77d); }
  &.green { background: linear-gradient(135deg, #a5d9b5, #8bc9a0); }
  &.purple { background: linear-gradient(135deg, #c9b3e3, #b59ad6); }
  &.pink { background: linear-gradient(135deg, #f2bed0, #e8a5b9); }
  &.yellow { background: linear-gradient(135deg, #f7e1ad, #f2d59e); }
}
</style>
