<template>
  <div class="page-container report-page">
    <div class="page-header">
      <h2 class="section-title">旅行总结报告</h2>
      <div class="header-actions">
        <a-select
          v-model="selectedTravel"
          placeholder="选择旅行"
          allow-clear
          style="width: 240px"
          size="small"
        >
          <a-option :value="null">全部旅行汇总</a-option>
          <a-option v-for="t in travels" :key="t.id" :value="t.id">{{ t.title }}</a-option>
        </a-select>
        <a-button type="primary" :icon="iconRefresh" size="small" @click="loadData">
          刷新数据
        </a-button>
        <a-button type="outline" :icon="iconSetting" size="small" @click="showConfig = true">
          报告设置
        </a-button>
        <a-button type="outline" :icon="iconEye" size="small" @click="openPreview">
          预览报告
        </a-button>
      </div>
    </div>

    <div class="report-layout" v-if="!loading">
      <div class="report-main">
        <a-card class="report-header-card" :bordered="false">
          <div class="report-title-block">
            <div class="rt-preview" v-if="customCover">
              <img :src="'file:///' + customCover.replace(/\\/g, '/')" />
            </div>
            <div class="rt-icon" v-else>✈️</div>
            <div class="rt-text-wrap">
              <h1 class="rt-title">{{ displayTitle }}</h1>
              <div class="rt-subtitle">{{ displaySubtitle }}</div>
            </div>
          </div>
          <div class="rt-meta">
            <div><span class="rl">报告模板</span><span class="rv">{{ currentTemplate.name }} {{ currentTemplate.preview }}</span></div>
            <div><span class="rl">报告生成</span><span class="rv">{{ today }}</span></div>
            <div v-if="dateRange"><span class="rl">时间跨度</span><span class="rv">{{ dateRange }}</span></div>
          </div>
        </a-card>

        <a-row :gutter="16" style="margin-bottom: 20px;" v-if="isModuleActive('overview')">
          <a-col :span="6" v-for="(s, i) in summaryStats" :key="i">
            <div class="mini-stat" :style="{ background: s.bg }">
              <div class="ms-icon" :style="{ color: s.color }">{{ s.icon }}</div>
              <div class="ms-value" :style="{ color: s.color }">{{ s.value }}</div>
              <div class="ms-label">{{ s.label }}</div>
            </div>
          </a-col>
        </a-row>

        <a-card class="section-card" :bordered="false" title="📊 旅行概览" v-if="isModuleActive('overview')">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="旅行次数">{{ overview.travels }} 次</a-descriptions-item>
            <a-descriptions-item label="相册数量">{{ overview.albums }} 个</a-descriptions-item>
            <a-descriptions-item label="照片数量">{{ overview.photos }} 张</a-descriptions-item>
            <a-descriptions-item label="视频数量">{{ overview.videos }} 个</a-descriptions-item>
            <a-descriptions-item label="足迹地点">{{ overview.locations }} 个</a-descriptions-item>
            <a-descriptions-item label="存储占用">{{ storageText }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card class="section-card" :bordered="false" title="💰 花费统计" v-if="isModuleActive('expenses') && expenseTotal > 0">
          <div class="expense-overview">
            <div class="eo-total">
              <div class="eo-label">累计花费</div>
              <div class="eo-value">¥ {{ expenseTotal.toFixed(2) }}</div>
            </div>
            <div class="eo-per-trip" v-if="overview.travels > 0">
              <div class="eo-label">平均每次</div>
              <div class="eo-value small">¥ {{ (expenseTotal / overview.travels).toFixed(2) }}</div>
            </div>
          </div>
          <div class="expense-chart" v-if="expenseSummary.length">
            <div v-for="(e, idx) in expenseSummary" :key="idx" class="ec-bar-row">
              <div class="ec-label">{{ categoryNames[e.category] || e.category }}</div>
              <div class="ec-bar">
                <div class="ec-fill" :style="{ width: (e.total / expenseTotal * 100) + '%', background: categoryColors[e.category] }"></div>
              </div>
              <div class="ec-amount">¥ {{ e.total.toFixed(2) }} ({{ ((e.total / expenseTotal) * 100).toFixed(1) }}%)</div>
            </div>
          </div>
        </a-card>

        <a-card class="section-card" :bordered="false" title="📝 行程安排" v-if="isModuleActive('itinerary') && travelList.length">
          <div class="itinerary-timeline">
            <div v-for="(t, idx) in travelList" :key="t.id" class="it-item">
              <div class="it-dot">{{ idx + 1 }}</div>
              <div class="it-body">
                <div class="it-title">
                  <span class="travel-link" @click="goTravel(t.id)">{{ t.title }}</span>
                </div>
                <div class="it-meta">
                  <span v-if="t.location">📍 {{ t.location }}</span>
                  <span v-if="t.start_date">📅 {{ t.start_date }}{{ t.end_date ? ' ~ ' + t.end_date : '' }}</span>
                  <span>⏱️ {{ getDays(t) }}</span>
                </div>
                <div class="it-desc" v-if="t.description">{{ t.description }}</div>
                <div class="it-counts">
                  <span>📷 {{ t.media_count || 0 }} 张照片</span>
                  <span>📁 {{ t.album_count || 0 }} 个相册</span>
                </div>
              </div>
            </div>
          </div>
        </a-card>

        <a-card class="section-card" :bordered="false" title="🗺️ 地图足迹" v-if="isModuleActive('map') && locationList.length">
          <div class="map-footprint">
            <div v-for="(loc, i) in locationList" :key="i" class="mf-item">
              <div class="mf-no">{{ i + 1 }}</div>
              <div class="mf-info">
                <div class="mf-name">{{ loc.name || loc.location || '未知地点' }}</div>
                <div class="mf-coord" v-if="loc.latitude && loc.longitude">{{ Number(loc.latitude).toFixed(4) }}, {{ Number(loc.longitude).toFixed(4) }}</div>
                <div class="mf-travel" v-if="loc.travelName">来自「{{ loc.travelName }}」</div>
              </div>
            </div>
          </div>
        </a-card>

        <a-card class="section-card" :bordered="false" title="🏷️ 热门标签" v-if="isModuleActive('overview') && topTags.length">
          <div class="tags-cloud">
            <a-tag
              v-for="(t, i) in topTags"
              :key="t.name"
              :color="tagColors[i % tagColors.length]"
              :style="{ fontSize: (12 + t.weight * 2) + 'px', padding: '4px 14px', margin: '4px' }"
            >
              {{ t.name }} ×{{ t.count }}
            </a-tag>
          </div>
        </a-card>

        <a-card class="section-card" :bordered="false" title="📸 精选照片" v-if="isModuleActive('highlights') && coverPhotos.length">
          <div class="cover-grid">
            <div v-for="(p, i) in coverPhotos" :key="p.id" class="cover-item" :class="{ big: i === 0 }">
              <img v-if="p.file_type === 'image'" :src="'file:///' + p.file_path.replace(/\\/g, '/')"
                   @error="e => e.target.style.display='none'" />
              <div v-else class="cover-video">🎬</div>
              <div v-if="p.description" class="cover-caption">{{ p.description }}</div>
            </div>
          </div>
        </a-card>

        <a-card class="section-card" :bordered="false" :title="`🖼️ 全部照片缩略图 (${allThumbPhotos.length}张)`" v-if="isModuleActive('thumbnails') && allThumbPhotos.length">
          <div class="thumbnails-grid">
            <div v-for="p in allThumbPhotos" :key="p.id" class="thumb-item">
              <img v-if="p.file_type === 'image'" :src="'file:///' + p.file_path.replace(/\\/g, '/')"
                   @error="e => e.target.style.display='none'" />
            </div>
          </div>
        </a-card>
      </div>

      <div class="report-aside">
        <div class="export-card">
          <div class="ec-head">
            <icon-file :size="22" style="color: #7eb8da" />
            <div>
              <div class="ec-title">导出报告</div>
              <div class="ec-desc">选择格式生成完整报告</div>
            </div>
          </div>
          <div class="ec-buttons">
            <a-button type="primary" block :icon="iconPdf" status="danger" :loading="exportingPdf" @click="exportPdf">
              导出 PDF 报告
            </a-button>
            <a-button block :icon="iconHtml" type="outline" :loading="exportingHtml" @click="exportHtml">
              导出 HTML 电子书
            </a-button>
            <a-button block :icon="iconWord" type="outline" status="primary" :loading="exportingWord" @click="exportWord">
              导出 Word 文档
            </a-button>
            <a-button block :icon="iconPpt" type="outline" status="warning" :loading="exportingPpt" @click="exportPpt">
              导出 PPT 演示
            </a-button>
            <a-button block :icon="iconText" type="outline" status="success" @click="exportJson">
              导出 JSON 数据
            </a-button>
          </div>
        </div>

        <a-card class="aside-card" :bordered="false" title="🎨 当前设置">
          <div class="current-settings">
            <div class="cs-row">
              <span class="cs-label">模板风格</span>
              <span class="cs-value">{{ currentTemplate.preview }} {{ currentTemplate.name }}</span>
            </div>
            <div class="cs-row">
              <span class="cs-label">启用模块</span>
              <span class="cs-value">{{ activeModuleCount }}/{{ REPORT_MODULES.length }}</span>
            </div>
            <div class="cs-row">
              <span class="cs-label">自定义封面</span>
              <span class="cs-value">{{ customCover ? '已设置' : '未设置' }}</span>
            </div>
            <a-button type="outline" size="small" block style="margin-top: 12px" @click="showConfig = true">
              修改设置
            </a-button>
          </div>
        </a-card>

        <a-card class="aside-card" :bordered="false" title="💡 旅行小贴士">
          <a-timeline>
            <a-timeline-item color="blue">在媒体中填写拍摄地点，地图足迹更完整</a-timeline-item>
            <a-timeline-item color="green">为每次旅行创建详细的行程记录</a-timeline-item>
            <a-timeline-item color="orange">使用标签功能来快速筛选照片</a-timeline-item>
            <a-timeline-item color="pink">别忘了记录每一笔旅行花费</a-timeline-item>
            <a-timeline-item color="purple">定期导出报告，留作永久纪念</a-timeline-item>
          </a-timeline>
        </a-card>
      </div>
    </div>

    <a-spin v-if="loading" :loading="true" tip="加载中..." style="min-height: 300px" />

    <a-modal
      v-model:visible="showConfig"
      title="报告设置"
      width="720px"
      ok-text="保存设置"
      cancel-text="取消"
      @ok="saveConfig"
      unmount-on-close
    >
      <a-tabs default-active-key="template">
        <a-tab-pane key="template" title="🎨 模板选择">
          <div class="template-grid">
            <div
              v-for="t in Object.values(REPORT_TEMPLATES)"
              :key="t.id"
              class="template-card"
              :class="{ active: config.template === t.id }"
              @click="config.template = t.id"
            >
              <div class="tc-preview">{{ t.preview }}</div>
              <div class="tc-name">{{ t.name }}</div>
              <div class="tc-desc">{{ t.description }}</div>
              <div class="tc-check" v-if="config.template === t.id">✓</div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="modules" title="📋 模块设置">
          <div class="modules-list">
            <div
              v-for="m in REPORT_MODULES"
              :key="m.id"
              class="module-item"
              :class="{ active: config.modules[m.id] }"
              @click="config.modules[m.id] = !config.modules[m.id]"
            >
              <div class="mi-check">
                <a-checkbox :checked="config.modules[m.id]" />
              </div>
              <div class="mi-icon">{{ m.icon }}</div>
              <div class="mi-info">
                <div class="mi-name">{{ m.name }}</div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="custom" title="✏️ 自定义内容">
          <a-form layout="vertical">
            <a-form-item label="报告标题">
              <a-input
                v-model="config.customTitle"
                :placeholder="`默认：${defaultTitle}`"
                allow-clear
                maxlength="50"
                show-word-limit
              />
            </a-form-item>
            <a-form-item label="副标题">
              <a-input
                v-model="config.customSubtitle"
                :placeholder="`默认：由 TravelMemory · 旅行记忆 自动生成`"
                allow-clear
                maxlength="100"
                show-word-limit
              />
            </a-form-item>
            <a-form-item label="自定义封面图">
              <div class="cover-uploader">
                <div class="cu-preview" v-if="config.customCover" @click="selectCoverImage">
                  <img :src="'file:///' + config.customCover.replace(/\\/g, '/')" />
                  <div class="cu-mask"><icon-edit :size="18" /> 更换</div>
                </div>
                <div class="cu-placeholder" v-else @click="selectCoverImage">
                  <icon-plus :size="24" />
                  <span>点击选择封面图</span>
                  <div class="cu-tip">推荐尺寸 1200×400 以上</div>
                </div>
                <a-button
                  v-if="config.customCover"
                  size="small"
                  type="text"
                  status="danger"
                  style="margin-left: 12px"
                  @click.stop="config.customCover = ''"
                >
                  移除封面
                </a-button>
              </div>
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-modal>

    <a-drawer
      v-model:visible="showPreview"
      title="报告预览"
      width="90%"
      :body-style="{ padding: 0 }"
    >
      <iframe
        ref="previewIframe"
        class="preview-iframe"
        :srcdoc="previewHtml"
        frameborder="0"
      ></iframe>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconRefresh,
  IconFile,
  IconFilePdf,
  IconCode,
  IconFileImage,
  IconSettings,
  IconEye,
  IconEdit,
  IconPlus,
  IconFolder,
  IconMenu
} from '@arco-design/web-vue/es/icon'
import { formatDate, formatDateTime, formatFileSize, parseTags, getDateRange } from '@/utils'
import jsPDF from 'jspdf'
import { REPORT_MODULES, REPORT_TEMPLATES, getTemplate, getActiveModules } from '@/utils/reportTemplates'
import { buildStyledHtml, buildWordDoc, buildPptSlides } from '@/utils/exportUtils'

const route = useRoute()
const router = useRouter()
const api = window.electronAPI

const iconRefresh = IconRefresh
const iconFile = IconFile
const iconPdf = IconFilePdf
const iconHtml = IconCode
const iconText = IconFileImage
const iconSetting = IconSettings
const iconEye = IconEye
const iconEdit = IconEdit
const iconPlus = IconPlus
const iconWord = IconFolder
const iconPpt = IconMenu

const loading = ref(true)
const travels = ref([])
const selectedTravel = ref(null)
const overview = ref({ travels: 0, albums: 0, photos: 0, videos: 0, locations: 0, totalSize: 0 })
const travelList = ref([])
const expenseSummary = ref([])
const expenseTotal = ref(0)
const allMedia = ref([])
const allTags = ref([])
const exportingPdf = ref(false)
const exportingHtml = ref(false)
const exportingWord = ref(false)
const exportingPpt = ref(false)
const showConfig = ref(false)
const showPreview = ref(false)
const previewIframe = ref(null)

const defaultModules = {}
for (const m of REPORT_MODULES) {
  defaultModules[m.id] = m.default
}

const config = reactive({
  template: 'elegant',
  modules: { ...defaultModules },
  customTitle: '',
  customSubtitle: '',
  customCover: ''
})

const categoryNames = {
  transport: '交通', accommodation: '住宿', food: '餐饮',
  ticket: '门票', shopping: '购物', entertainment: '娱乐', other: '其他'
}
const categoryColors = {
  transport: '#7eb8da', accommodation: '#c4a77d', food: '#e8a5b9',
  ticket: '#8bc9a0', shopping: '#b59ad6', entertainment: '#f2d59e', other: '#b0b0b0'
}

const today = computed(() => formatDate(new Date()))

const defaultTitle = computed(() => {
  if (selectedTravel.value) {
    const t = travels.value.find(x => x.id === selectedTravel.value)
    return t ? `${t.title} · 旅行总结` : '我的旅行记忆总结'
  }
  return '我的旅行记忆 · 年度总结报告'
})

const displayTitle = computed(() => config.customTitle || defaultTitle.value)
const displaySubtitle = computed(() => config.customSubtitle || '由 TravelMemory · 旅行记忆 自动生成')
const customCover = computed(() => config.customCover)

const dateRange = computed(() => {
  const dates = travelList.value.flatMap(t => [t.start_date, t.end_date]).filter(Boolean)
  if (!dates.length) return ''
  dates.sort()
  return `${dates[0]} ~ ${dates[dates.length - 1]}`
})

const storageText = computed(() => formatFileSize(overview.value.totalSize || 0))

const summaryStats = computed(() => [
  { icon: '✈️', label: '旅行次数', value: overview.value.travels, color: '#5a9fc4', bg: 'linear-gradient(135deg, #e3f2f9, #d4ebf7)' },
  { icon: '📷', label: '照片总数', value: overview.value.photos, color: '#6ab384', bg: 'linear-gradient(135deg, #e4f4eb, #d2ecd9)' },
  { icon: '🎬', label: '视频总数', value: overview.value.videos, color: '#d1879f', bg: 'linear-gradient(135deg, #fbe8ee, #f6d6e0)' },
  { icon: '📍', label: '足迹地点', value: overview.value.locations, color: '#9a7fc0', bg: 'linear-gradient(135deg, #f0e8f7, #e5d6f0)' }
])

const currentTemplate = computed(() => getTemplate(config.template))

const activeModuleCount = computed(() => {
  return Object.values(config.modules).filter(Boolean).length
})

const topTags = computed(() => {
  const counter = {}
  for (const m of allMedia.value) {
    for (const t of parseTags(m.tags)) {
      counter[t] = (counter[t] || 0) + 1
    }
  }
  for (const t of travels.value) {
    for (const tag of parseTags(t.tags)) {
      counter[tag] = (counter[tag] || 0) + 1
    }
  }
  const arr = Object.entries(counter)
    .map(([name, count]) => ({ name, count, weight: Math.min(count, 5) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
  return arr
})

const tagColors = ['blue', 'green', 'orange', 'pink', 'purple', 'cyan', 'arcoblue', 'orangered']

const coverPhotos = computed(() => allMedia.value.slice(0, 8))
const allThumbPhotos = computed(() => allMedia.value.filter(m => m.file_type === 'image').slice(0, 100))

const locationList = computed(() => {
  const locs = []
  const seen = new Set()
  for (const t of travelList.value) {
    if (t.location || (t.latitude && t.longitude)) {
      const key = `${t.location}-${t.latitude}-${t.longitude}`
      if (!seen.has(key)) {
        seen.add(key)
        locs.push({
          name: t.location,
          location: t.location,
          latitude: t.latitude,
          longitude: t.longitude,
          travelName: t.title
        })
      }
    }
  }
  for (const m of allMedia.value) {
    if (m.location || (m.latitude && m.longitude)) {
      const key = `${m.location}-${m.latitude}-${m.longitude}`
      if (!seen.has(key)) {
        seen.add(key)
        locs.push({
          name: m.location,
          location: m.location,
          latitude: m.latitude,
          longitude: m.longitude,
          travelName: ''
        })
      }
    }
  }
  return locs.slice(0, 50)
})

const isModuleActive = (id) => {
  return config.modules[id] !== undefined ? config.modules[id] : true
}

const getDays = (t) => getDateRange(t.start_date, t.end_date) + '天'
const goTravel = id => router.push(`/travels/${id}`)

const loadData = async () => {
  loading.value = true
  try {
    travels.value = await api.travel.list()
    const ov = await api.stats.overview()
    overview.value = ov

    if (selectedTravel.value) {
      travelList.value = travels.value.filter(t => t.id === selectedTravel.value)
      const t = travelList.value[0]
      overview.value = {
        travels: 1,
        albums: t?.album_count || 0,
        photos: (await api.media.list({ travel_id: selectedTravel.value, file_type: 'image' })).length,
        videos: (await api.media.list({ travel_id: selectedTravel.value, file_type: 'video' })).length,
        locations: ov.locations,
        totalSize: ov.totalSize
      }
      expenseSummary.value = await api.expense.summary(selectedTravel.value)
      const expList = await api.expense.list(selectedTravel.value)
      expenseTotal.value = expList.reduce((s, e) => s + Number(e.amount || 0), 0)
      allMedia.value = await api.media.getByTravel(selectedTravel.value)
    } else {
      travelList.value = travels.value
      expenseSummary.value = []
      expenseTotal.value = 0
      for (const t of travels.value) {
        const list = await api.expense.list(t.id)
        expenseTotal.value += list.reduce((s, e) => s + Number(e.amount || 0), 0)
        const summary = await api.expense.summary(t.id)
        for (const s of summary) {
          const existing = expenseSummary.value.find(e => e.category === s.category)
          if (existing) {
            existing.total += s.total
            existing.count += s.count
          } else {
            expenseSummary.value.push({ ...s })
          }
        }
      }
      expenseSummary.value.sort((a, b) => b.total - a.total)
      allMedia.value = await api.media.list({ limit: 200 })
    }
    allTags.value = await api.tags.list()
  } finally {
    loading.value = false
  }
}

const buildExportData = () => ({
  title: defaultTitle.value,
  subtitle: '由 TravelMemory · 旅行记忆 自动生成',
  today: today.value,
  overview: overview.value,
  summaryStats: summaryStats.value,
  travelList: travelList.value,
  expenseSummary: expenseSummary.value,
  expenseTotal: expenseTotal.value,
  expensePerTrip: overview.value.travels > 0 ? expenseTotal.value / overview.value.travels : 0,
  coverPhotos: coverPhotos.value,
  allPhotos: allThumbPhotos.value,
  topTags: topTags.value,
  categoryNames,
  categoryColors,
  locations: locationList.value
})

const buildReportContent = () => {
  const lines = []
  lines.push(`# ${displayTitle.value}`)
  lines.push(`> ${displaySubtitle.value} · ${today.value}`)
  lines.push('')
  if (isModuleActive('overview')) {
    lines.push('## 📊 概览')
    lines.push(`- 旅行次数：${overview.value.travels} 次`)
    lines.push(`- 照片：${overview.value.photos} 张 · 视频：${overview.value.videos} 个`)
    lines.push(`- 相册：${overview.value.albums} 个`)
    lines.push(`- 足迹地点：${overview.value.locations} 个`)
    lines.push(`- 存储占用：${storageText.value}`)
    if (expenseTotal.value > 0) {
      lines.push(`- 累计花费：¥ ${expenseTotal.value.toFixed(2)}`)
    }
    lines.push('')
  }
  if (isModuleActive('itinerary') && travelList.value.length) {
    lines.push('## 📝 行程安排')
    for (const t of travelList.value) {
      lines.push(`### ${t.title}`)
      if (t.location) lines.push(`- 地点：${t.location}`)
      if (t.start_date) lines.push(`- 日期：${t.start_date} ~ ${t.end_date || t.start_date}`)
      lines.push(`- 天数：${getDays(t)}`)
      lines.push(`- 照片：${t.media_count || 0} 张 · 相册：${t.album_count || 0} 个`)
      if (t.description) lines.push(`> ${t.description}`)
      const tags = parseTags(t.tags)
      if (tags.length) lines.push(`- 标签：${tags.join(', ')}`)
      lines.push('')
    }
  }
  if (isModuleActive('expenses') && expenseSummary.value.length) {
    lines.push('## 💰 花费统计')
    lines.push(`**累计：¥ ${expenseTotal.value.toFixed(2)}**`)
    for (const e of expenseSummary.value) {
      const pct = ((e.total / expenseTotal.value) * 100).toFixed(1)
      lines.push(`- ${categoryNames[e.category] || e.category}：¥ ${e.total.toFixed(2)} (${pct}%)`)
    }
    lines.push('')
  }
  if (isModuleActive('map') && locationList.value.length) {
    lines.push('## 🗺️ 地图足迹')
    locationList.value.forEach((l, i) => {
      lines.push(`${i + 1}. ${l.name || l.location || '未知地点'}${l.latitude && l.longitude ? ` (${Number(l.latitude).toFixed(4)}, ${Number(l.longitude).toFixed(4)})` : ''}`)
    })
    lines.push('')
  }
  if (topTags.value.length && isModuleActive('overview')) {
    lines.push('## 🏷️ 标签')
    lines.push(topTags.value.map(t => `#${t.name}(${t.count})`).join('  '))
    lines.push('')
  }
  if (isModuleActive('highlights') && coverPhotos.value.length) {
    lines.push('## 📸 精选照片')
    lines.push(`共 ${coverPhotos.value.filter(p => p.file_type === 'image').length} 张精选照片`)
    lines.push('')
  }
  if (isModuleActive('thumbnails') && allThumbPhotos.value.length) {
    lines.push('## 🖼️ 全部照片')
    lines.push(`共 ${allThumbPhotos.value.length} 张照片`)
    lines.push('')
  }
  lines.push('---')
  lines.push('*这是一份由 TravelMemory 自动生成的旅行总结报告*')
  return lines.join('\n')
}

const buildHtml = () => {
  return buildStyledHtml({
    template: config.template,
    modules: config.modules,
    customTitle: config.customTitle,
    customSubtitle: config.customSubtitle,
    customCover: config.customCover,
    data: buildExportData()
  })
}

const previewHtml = computed(() => buildHtml())

const openPreview = () => {
  showPreview.value = true
}

const selectCoverImage = async () => {
  const result = await api.selectFiles({
    filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
  })
  if (result.canceled || !result.filePaths?.length) return
  config.customCover = result.filePaths[0]
}

const saveConfig = () => {
  Message.success('报告设置已更新')
  showConfig.value = false
}

const exportPdf = async () => {
  exportingPdf.value = true
  try {
    const r = await api.saveDialog({
      defaultPath: `${displayTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.pdf`,
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
    })
    if (r.canceled || !r.filePath) return
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.setTextColor(90, 159, 196)
    doc.text(displayTitle.value, 20, 25)
    doc.setFontSize(10)
    doc.setTextColor(168, 138, 92)
    doc.text(`${displaySubtitle.value} · ${today.value}`, 20, 35)
    doc.setFontSize(11)
    doc.setTextColor(74, 74, 74)
    const content = buildReportContent()
    const lines = doc.splitTextToSize(content.replace(/#+/g, '').replace(/[>\-*`]/g, ''), 170)
    let y = 50
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, 20, y)
      y += 7
    }
    const buffer = doc.output('arraybuffer')
    await api.writeFile(r.filePath, new Uint8Array(buffer))
    Message.success(`PDF 报告已导出至：${r.filePath}`)
    setTimeout(() => api.showItemInFolder(r.filePath), 500)
  } catch (e) {
    console.error(e)
    Message.error('导出失败：' + e.message)
  } finally {
    exportingPdf.value = false
  }
}

const exportHtml = async () => {
  exportingHtml.value = true
  try {
    const r = await api.saveDialog({
      defaultPath: `${displayTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.html`,
      filters: [{ name: 'HTML 文件', extensions: ['html', 'htm'] }]
    })
    if (r.canceled || !r.filePath) return
    await api.writeFile(r.filePath, buildHtml())
    Message.success(`HTML 电子书已导出至：${r.filePath}`)
    setTimeout(() => api.showItemInFolder(r.filePath), 500)
  } catch (e) {
    console.error(e)
    Message.error('导出失败：' + e.message)
  } finally {
    exportingHtml.value = false
  }
}

const exportWord = async () => {
  exportingWord.value = true
  try {
    const r = await api.saveDialog({
      defaultPath: `${displayTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.doc`,
      filters: [{ name: 'Word 文档', extensions: ['doc', 'docx'] }]
    })
    if (r.canceled || !r.filePath) return
    const docContent = await buildWordDoc({
      template: config.template,
      modules: config.modules,
      customTitle: config.customTitle,
      customSubtitle: config.customSubtitle,
      customCover: config.customCover,
      data: buildExportData()
    })
    await api.writeFile(r.filePath, docContent)
    Message.success(`Word 文档已导出至：${r.filePath}`)
    setTimeout(() => api.showItemInFolder(r.filePath), 500)
  } catch (e) {
    console.error(e)
    Message.error('导出失败：' + e.message)
  } finally {
    exportingWord.value = false
  }
}

const exportPpt = async () => {
  exportingPpt.value = true
  try {
    const r = await api.saveDialog({
      defaultPath: `${displayTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.ppt`,
      filters: [{ name: 'PowerPoint 演示', extensions: ['ppt', 'pptx'] }]
    })
    if (r.canceled || !r.filePath) return
    const pptContent = await buildPptSlides({
      template: config.template,
      modules: config.modules,
      customTitle: config.customTitle,
      customSubtitle: config.customSubtitle,
      data: buildExportData()
    })
    await api.writeFile(r.filePath, pptContent)
    Message.success(`PPT 演示已导出至：${r.filePath}`)
    setTimeout(() => api.showItemInFolder(r.filePath), 500)
  } catch (e) {
    console.error(e)
    Message.error('导出失败：' + e.message)
  } finally {
    exportingPpt.value = false
  }
}

const exportJson = async () => {
  try {
    const r = await api.saveDialog({
      defaultPath: `${displayTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.json`,
      filters: [{ name: 'JSON 数据', extensions: ['json'] }]
    })
    if (r.canceled || !r.filePath) return
    const data = {
      generatedAt: new Date().toISOString(),
      reportTitle: displayTitle.value,
      customSubtitle: config.customSubtitle,
      customCover: config.customCover,
      template: config.template,
      activeModules: getActiveModules(config.modules).map(m => m.id),
      overview: overview.value,
      travels: travelList.value,
      mediaCount: allMedia.value.length,
      expenseTotal: expenseTotal.value,
      expenseSummary: expenseSummary.value,
      topTags: topTags.value,
      locations: locationList.value
    }
    await api.writeFile(r.filePath, JSON.stringify(data, null, 2))
    Message.success(`JSON 数据已导出`)
  } catch (e) {
    console.error(e)
    Message.error('导出失败')
  }
}

onMounted(async () => {
  const q = route.query.travel
  if (q) selectedTravel.value = Number(q)
  await loadData()
})

watch(selectedTravel, loadData)
</script>

<style lang="less" scoped>
.report-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    .section-title { margin: 0; }
  }
  .header-actions { display: flex; gap: 10px; align-items: center; }

  .report-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
  }

  .report-header-card {
    border-radius: 16px !important;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #fffaf0, #f5f9fc) !important;
    border: 1px solid #f0ebe3 !important;
  }

  .report-title-block {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 16px;
  }

  .rt-preview {
    width: 100px;
    height: 70px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid #e8e0d4;
    img { width: 100%; height: 100%; object-fit: cover; }
  }

  .rt-icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #e3f2f9, #f5efe0);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
  }

  .rt-text-wrap { flex: 1; min-width: 0; }

  .rt-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #5a9fc4, #c4a77d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .rt-subtitle {
    font-size: 12px;
    color: #a88a5c;
    margin-top: 4px;
  }

  .rt-meta {
    display: flex;
    gap: 24px;
    padding-top: 14px;
    border-top: 1px dashed #e8e0d4;
    font-size: 12px;
    flex-wrap: wrap;

    .rl { color: #a88a5c; margin-right: 6px; }
    .rv { color: #4a4a4a; font-weight: 500; }
  }

  .mini-stat {
    border-radius: 14px;
    padding: 20px;
    text-align: center;
  }

  .ms-icon { font-size: 26px; margin-bottom: 6px; }
  .ms-value { font-size: 28px; font-weight: 700; line-height: 1.1; }
  .ms-label { font-size: 11px; color: #a88a5c; margin-top: 6px; letter-spacing: 0.5px; }

  .section-card {
    border-radius: 16px !important;
    margin-bottom: 20px;
    border: 1px solid #f0ebe3 !important;

    :deep(.arco-card-header-title) {
      font-size: 15px;
      font-weight: 600;
      color: #4a4a4a;
    }
  }

  .itinerary-timeline { position: relative; padding-left: 28px; }
  .itinerary-timeline::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: linear-gradient(180deg, #7eb8da, transparent);
  }
  .it-item { position: relative; margin-bottom: 18px; }
  .it-dot {
    position: absolute;
    left: -24px;
    top: 4px;
    width: 20px;
    height: 20px;
    background: #7eb8da;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    border: 3px solid #fff;
    box-shadow: 0 0 0 2px #7eb8da44;
  }
  .it-body {
    padding: 12px 16px;
    background: #faf6f0;
    border-radius: 12px;
  }
  .it-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
  .it-meta { display: flex; gap: 14px; font-size: 12px; color: #a88a5c; flex-wrap: wrap; margin-bottom: 6px; }
  .it-desc { font-size: 13px; color: #555; padding: 8px 12px; background: #fff; border-radius: 8px; border-left: 3px solid #7eb8da; margin-bottom: 6px; }
  .it-counts { display: flex; gap: 14px; font-size: 12px; color: #888; }
  .travel-link { color: #5a9fc4; cursor: pointer; font-weight: 500; }
  .travel-link:hover { text-decoration: underline; }

  .map-footprint {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .mf-item {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    background: #f5f9fc;
    border-radius: 10px;
    align-items: flex-start;
  }
  .mf-no {
    width: 24px;
    height: 24px;
    background: #9a7fc0;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .mf-name { font-size: 13px; font-weight: 500; color: #4a4a4a; }
  .mf-coord { font-size: 10px; color: #9a7fc0; font-family: monospace; margin-top: 2px; }
  .mf-travel { font-size: 11px; color: #a88a5c; margin-top: 2px; }

  .expense-overview {
    display: flex;
    gap: 24px;
    padding: 16px 20px;
    background: linear-gradient(135deg, #faf6f0, #f5f9fc);
    border-radius: 12px;
    margin-bottom: 18px;
  }

  .eo-label { font-size: 11px; color: #a88a5c; letter-spacing: 1px; margin-bottom: 4px; }
  .eo-value {
    font-size: 30px;
    font-weight: 700;
    color: #e74c3c;
    font-family: 'Segoe UI', sans-serif;
    &.small { font-size: 20px; color: #c0392b; }
  }

  .expense-chart { padding: 0 8px; }

  .ec-bar-row {
    display: grid;
    grid-template-columns: 70px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 7px 0;
    font-size: 12px;
  }

  .ec-label { color: #555; font-weight: 500; }
  .ec-bar { height: 10px; background: #f5efe0; border-radius: 5px; overflow: hidden; }
  .ec-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; }
  .ec-amount { color: #8a8a8a; white-space: nowrap; }

  .tags-cloud { padding: 8px 0; }

  .cover-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .cover-item {
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    background: #f5efe0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    position: relative;
    img { width: 100%; height: 100%; object-fit: cover; }
    &.big {
      grid-column: span 2;
      grid-row: span 2;
      aspect-ratio: 1;
    }
  }
  .cover-video { background: #e8e0d4; }
  .cover-caption {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 6px 10px;
    background: linear-gradient(transparent, rgba(0,0,0,0.6));
    color: #fff;
    font-size: 11px;
  }

  .thumbnails-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }
  .thumb-item {
    aspect-ratio: 1;
    border-radius: 4px;
    overflow: hidden;
    background: #f5efe0;
    img { width: 100%; height: 100%; object-fit: cover; }
  }

  .export-card {
    background: linear-gradient(160deg, #fff, #faf6f0);
    border: 1px solid #f0ebe3;
    border-radius: 16px;
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 4px 16px rgba(126, 184, 218, 0.08);

    .ec-head {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 18px;
      padding-bottom: 16px;
      border-bottom: 1px dashed #e8e0d4;
    }
    .ec-title { font-weight: 700; font-size: 15px; color: #4a4a4a; margin-bottom: 3px; }
    .ec-desc { font-size: 11px; color: #a88a5c; }
    .ec-buttons { display: flex; flex-direction: column; gap: 10px; }
  }

  .aside-card { border-radius: 16px !important; border: 1px solid #f0ebe3 !important; margin-bottom: 20px; }

  .current-settings {
    .cs-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 13px;
      border-bottom: 1px dashed #f0ebe3;
    }
    .cs-row:last-of-type { border-bottom: none; }
    .cs-label { color: #a88a5c; }
    .cs-value { color: #4a4a4a; font-weight: 500; }
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .template-card {
    position: relative;
    padding: 20px;
    border: 2px solid #f0ebe3;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #faf6f0;
    &:hover {
      border-color: #7eb8da;
      transform: translateY(-2px);
    }
    &.active {
      border-color: #7eb8da;
      background: #f5f9fc;
      box-shadow: 0 4px 12px rgba(126, 184, 218, 0.2);
    }
  }
  .tc-preview { font-size: 36px; margin-bottom: 10px; }
  .tc-name { font-size: 15px; font-weight: 600; color: #4a4a4a; margin-bottom: 4px; }
  .tc-desc { font-size: 12px; color: #a88a5c; line-height: 1.5; }
  .tc-check {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 22px;
    height: 22px;
    background: #7eb8da;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }

  .modules-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .module-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid #f0ebe3;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    &:hover { border-color: #7eb8da; background: #fafcfd; }
    &.active {
      border-color: #7eb8da;
      background: #f5f9fc;
    }
  }
  .mi-icon { font-size: 22px; }
  .mi-name { font-size: 14px; font-weight: 500; color: #4a4a4a; }

  .cover-uploader {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .cu-preview, .cu-placeholder {
    width: 240px;
    height: 100px;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    border: 2px dashed #e8e0d4;
  }
  .cu-preview {
    border-style: solid;
    border-color: transparent;
    img { width: 100%; height: 100%; object-fit: cover; }
    &:hover .cu-mask { opacity: 1; }
  }
  .cu-mask {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.6);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.2s ease;
    font-size: 13px;
  }
  .cu-placeholder {
    background: #faf6f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #b0a08a;
    font-size: 13px;
    transition: all 0.2s ease;
    &:hover {
      border-color: #7eb8da;
      color: #7eb8da;
      background: #f5f9fc;
    }
  }
  .cu-tip { font-size: 11px; opacity: 0.8; }

  .preview-iframe {
    width: 100%;
    height: calc(100vh - 60px);
    border: none;
  }
}
</style>
