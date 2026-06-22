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
      </div>
    </div>

    <div class="report-layout" v-if="!loading">
      <div class="report-main">
        <a-card class="report-header-card" :bordered="false">
          <div class="report-title-block">
            <div class="rt-icon">✈️</div>
            <div>
              <h1 class="rt-title">{{ reportTitle }}</h1>
              <div class="rt-subtitle">由 TravelMemory · 旅行记忆 自动生成</div>
            </div>
          </div>
          <div class="rt-meta">
            <div><span class="rl">报告生成</span><span class="rv">{{ today }}</span></div>
            <div v-if="dateRange"><span class="rl">时间跨度</span><span class="rv">{{ dateRange }}</span></div>
          </div>
        </a-card>

        <a-row :gutter="16" style="margin-bottom: 20px;">
          <a-col :span="6" v-for="(s, i) in summaryStats" :key="i">
            <div class="mini-stat" :style="{ background: s.bg }">
              <div class="ms-icon" :style="{ color: s.color }">{{ s.icon }}</div>
              <div class="ms-value" :style="{ color: s.color }">{{ s.value }}</div>
              <div class="ms-label">{{ s.label }}</div>
            </div>
          </a-col>
        </a-row>

        <a-card class="section-card" :bordered="false" title="📊 旅行概览">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="旅行次数">{{ overview.travels }} 次</a-descriptions-item>
            <a-descriptions-item label="相册数量">{{ overview.albums }} 个</a-descriptions-item>
            <a-descriptions-item label="照片数量">{{ overview.photos }} 张</a-descriptions-item>
            <a-descriptions-item label="视频数量">{{ overview.videos }} 个</a-descriptions-item>
            <a-descriptions-item label="足迹地点">{{ overview.locations }} 个</a-descriptions-item>
            <a-descriptions-item label="存储占用">{{ storageText }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card class="section-card" :bordered="false" title="💰 花费统计" v-if="expenseTotal > 0">
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

        <a-card class="section-card" :bordered="false" title="📝 旅行清单" v-if="travelList.length">
          <a-table :data="travelList" :pagination="false" size="small">
            <template #columns>
              <a-table-column title="旅行" width="30%">
                <template #cell="{ record }">
                  <span class="travel-link" @click="goTravel(record.id)">{{ record.title }}</span>
                </template>
              </a-table-column>
              <a-table-column title="地点" data-index="location" width="18%" />
              <a-table-column title="日期" width="22%">
                <template #cell="{ record }">
                  {{ record.start_date || '-' }} ~ {{ record.end_date || record.start_date || '-' }}
                </template>
              </a-table-column>
              <a-table-column title="照片" data-index="media_count" width="8%" align="center" />
              <a-table-column title="相册" data-index="album_count" width="8%" align="center" />
              <a-table-column title="天数" width="8%" align="center">
                <template #cell="{ record }">
                  {{ getDays(record) }}
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>

        <a-card class="section-card" :bordered="false" title="🏷️ 热门标签" v-if="topTags.length">
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

        <a-card class="section-card" :bordered="false" title="📸 精选照片" v-if="coverPhotos.length">
          <div class="cover-grid">
            <div v-for="(p, i) in coverPhotos" :key="p.id" class="cover-item">
              <img v-if="p.file_type === 'image'" :src="'file:///' + p.file_path.replace(/\\/g, '/')"
                   @error="e => e.target.style.display='none'" />
              <div v-else class="cover-video">🎬</div>
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
            <a-button block :icon="iconText" type="outline" status="success" @click="exportJson">
              导出 JSON 数据
            </a-button>
          </div>
        </div>

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
  </div>
</template>

<script setup>import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconRefresh,
  IconFile,
  IconFilePdf,
  IconCode,
  IconFileImage
} from '@arco-design/web-vue/es/icon'
import { formatDate, formatDateTime, formatFileSize, parseTags, getDateRange } from '@/utils'
import jsPDF from 'jspdf'

const route = useRoute()
const router = useRouter()
const api = window.electronAPI

const iconRefresh = IconRefresh
const iconFile = IconFile
const iconPdf = IconFilePdf
const iconHtml = IconCode
const iconText = IconFileImage

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

const categoryNames = {
  transport: '交通', accommodation: '住宿', food: '餐饮',
  ticket: '门票', shopping: '购物', entertainment: '娱乐', other: '其他'
}
const categoryColors = {
  transport: '#7eb8da', accommodation: '#c4a77d', food: '#e8a5b9',
  ticket: '#8bc9a0', shopping: '#b59ad6', entertainment: '#f2d59e', other: '#b0b0b0'
}

const today = computed(() => formatDate(new Date()))

const reportTitle = computed(() => {
  if (selectedTravel.value) {
    const t = travels.value.find(x => x.id === selectedTravel.value)
    return t ? `${t.title} · 旅行总结` : '我的旅行记忆总结'
  }
  return '我的旅行记忆 · 年度总结报告'
})

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
      allMedia.value = await api.media.list({ limit: 100 })
    }
    allTags.value = await api.tags.list()
  } finally {
    loading.value = false
  }
}

const buildReportContent = () => {
  const lines = []
  lines.push(`# ${reportTitle.value}`)
  lines.push(`> 由 TravelMemory · 旅行记忆 生成 · ${today.value}`)
  lines.push('')
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
  if (travelList.value.length) {
    lines.push('## ✈️ 旅行清单')
    for (const t of travelList.value) {
      lines.push(`### ${t.title}`)
      if (t.location) lines.push(`- 地点：${t.location}`)
      if (t.start_date) lines.push(`- 日期：${t.start_date} ~ ${t.end_date || t.start_date}`)
      lines.push(`- 照片：${t.media_count || 0} 张 · 相册：${t.album_count || 0} 个`)
      if (t.description) lines.push(`> ${t.description}`)
      const tags = parseTags(t.tags)
      if (tags.length) lines.push(`- 标签：${tags.join(', ')}`)
      lines.push('')
    }
  }
  if (expenseSummary.value.length) {
    lines.push('## 💰 花费统计')
    lines.push(`**累计：¥ ${expenseTotal.value.toFixed(2)}**`)
    for (const e of expenseSummary.value) {
      const pct = ((e.total / expenseTotal.value) * 100).toFixed(1)
      lines.push(`- ${categoryNames[e.category] || e.category}：¥ ${e.total.toFixed(2)} (${pct}%)`)
    }
    lines.push('')
  }
  if (topTags.value.length) {
    lines.push('## 🏷️ 标签')
    lines.push(topTags.value.map(t => `#${t.name}(${t.count})`).join('  '))
    lines.push('')
  }
  lines.push('---')
  lines.push('*这是一份由 TravelMemory 自动生成的旅行总结报告*')
  return lines.join('\n')
}

const buildHtml = () => {
  const photos = coverPhotos.value
    .filter(p => p.file_type === 'image')
    .map(p => `file:///${p.file_path.replace(/\\/g, '/')}`)
  const md = buildReportContent()
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${reportTitle.value}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(180deg, #f5efe6 0%, #faf6f0 100%);
  color: #4a4a4a;
  line-height: 1.7;
  padding: 40px 20px;
}
.container { max-width: 820px; margin: 0 auto; background: #fff; padding: 48px; border-radius: 20px; box-shadow: 0 10px 60px rgba(0,0,0,0.08); }
.cover {
  text-align: center;
  padding: 40px 20px 30px;
  margin-bottom: 30px;
  background: linear-gradient(135deg, #e3f2f9 0%, #f5efe0 100%);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}
.cover .plane { font-size: 56px; margin-bottom: 8px; }
.cover h1 { font-size: 32px; background: linear-gradient(135deg, #5a9fc4, #c4a77d); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px; }
.cover .sub { color: #a88a5c; font-size: 13px; }
h2 { font-size: 20px; color: #5a9fc4; border-left: 4px solid #7eb8da; padding-left: 12px; margin: 32px 0 16px; }
h3 { font-size: 16px; color: #c4a77d; margin: 20px 0 10px; }
p, li { font-size: 14px; color: #555; }
ul { list-style: none; padding-left: 0; }
ul li { padding: 4px 0; }
blockquote { background: #faf6f0; border-left: 3px solid #a8d8ea; padding: 10px 14px; border-radius: 6px; margin: 10px 0; color: #777; font-size: 13px; }
.gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
.gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
.stat-item { background: #faf6f0; padding: 16px; border-radius: 12px; text-align: center; }
.stat-num { font-size: 24px; font-weight: 700; color: #5a9fc4; }
.stat-label { font-size: 11px; color: #a88a5c; margin-top: 4px; }
.expense-bar { margin: 8px 0; display: flex; align-items: center; gap: 10px; font-size: 13px; }
.expense-bar .cat { width: 80px; }
.expense-bar .bar { flex: 1; height: 8px; background: #f5efe0; border-radius: 4px; overflow: hidden; }
.expense-bar .fill { height: 100%; border-radius: 4px; }
.tags { margin-top: 10px; }
.tags span { display: inline-block; background: #e3f2f9; color: #5a9fc4; padding: 3px 10px; border-radius: 12px; font-size: 12px; margin: 3px; }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #e8e0d4; text-align: center; font-size: 12px; color: #c0b8a8; }
</style>
</head>
<body>
<div class="container">
  <div class="cover">
    <div class="plane">✈️</div>
    <h1>${reportTitle.value}</h1>
    <div class="sub">由 TravelMemory · 旅行记忆 生成 · ${today.value}</div>
  </div>

  <div class="stats">
    <div class="stat-item"><div class="stat-num">${overview.value.travels}</div><div class="stat-label">旅行次数</div></div>
    <div class="stat-item"><div class="stat-num">${overview.value.photos}</div><div class="stat-label">照片总数</div></div>
    <div class="stat-item"><div class="stat-num">${overview.value.videos}</div><div class="stat-label">视频总数</div></div>
    <div class="stat-item"><div class="stat-num">${overview.value.locations}</div><div class="stat-label">足迹地点</div></div>
  </div>

  <h2>✈️ 旅行清单</h2>
  ${travelList.value.map(t => `
    <h3>${t.title}</h3>
    <ul>
      ${t.location ? `<li>📍 <b>地点：</b>${t.location}</li>` : ''}
      ${t.start_date ? `<li>📅 <b>日期：</b>${t.start_date} ~ ${t.end_date || t.start_date}</li>` : ''}
      <li>📷 <b>媒体：</b>${t.media_count || 0} 张照片 · ${t.album_count || 0} 个相册</li>
    </ul>
    ${t.description ? `<blockquote>${t.description.replace(/</g, '&lt;')}</blockquote>` : ''}
  `).join('')}

  ${expenseSummary.value.length ? `
  <h2>💰 花费统计 (总计 ¥ ${expenseTotal.value.toFixed(2)})</h2>
  ${expenseSummary.value.map(e => `
    <div class="expense-bar">
      <span class="cat">${categoryNames[e.category] || e.category}</span>
      <div class="bar"><div class="fill" style="width:${(e.total / expenseTotal.value * 100)}%;background:${categoryColors[e.category] || '#ccc'}"></div></div>
      <span>¥ ${e.total.toFixed(2)} (${((e.total / expenseTotal.value) * 100).toFixed(1)}%)</span>
    </div>
  `).join('')}
  ` : ''}

  ${topTags.value.length ? `
  <h2>🏷️ 标签</h2>
  <div class="tags">${topTags.value.map(t => `<span>#${t.name} ×${t.count}</span>`).join('')}</div>
  ` : ''}

  ${photos.length ? `
  <h2>📸 精选照片</h2>
  <div class="gallery">${photos.map(p => `<img src="${p}" onerror="this.style.display='none'" />`).join('')}</div>
  ` : ''}

  <div class="footer">
    <p>这份报告由 TravelMemory · 旅行记忆 自动生成</p>
    <p>愿每一段旅程都被温柔铭记 ❤️</p>
  </div>
</div>
</body>
</html>`
}

const exportPdf = async () => {
  exportingPdf.value = true
  try {
    const r = await api.saveDialog({
      defaultPath: `${reportTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.pdf`,
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
    })
    if (r.canceled || !r.filePath) return
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.setTextColor(90, 159, 196)
    doc.text(reportTitle.value, 20, 25)
    doc.setFontSize(10)
    doc.setTextColor(168, 138, 92)
    doc.text(`Generated by TravelMemory · ${today.value}`, 20, 35)
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
      defaultPath: `${reportTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.html`,
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

const exportJson = async () => {
  try {
    const r = await api.saveDialog({
      defaultPath: `${reportTitle.value.replace(/[\\/:*?"<>|]/g, '_')}.json`,
      filters: [{ name: 'JSON 数据', extensions: ['json'] }]
    })
    if (r.canceled || !r.filePath) return
    const data = {
      generatedAt: new Date().toISOString(),
      reportTitle: reportTitle.value,
      overview: overview.value,
      travels: travelList.value,
      mediaCount: allMedia.value.length,
      expenseTotal: expenseTotal.value,
      expenseSummary: expenseSummary.value,
      topTags: topTags.value
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

  .rt-icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #e3f2f9, #f5efe0);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }

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

  .travel-link { color: #5a9fc4; cursor: pointer; font-weight: 500; }
  .travel-link:hover { text-decoration: underline; }

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

  .aside-card { border-radius: 16px !important; border: 1px solid #f0ebe3 !important; }
}
</style>
