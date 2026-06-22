<template>
  <div class="page-container timeline-page">
    <div class="page-header">
      <h2 class="section-title">旅行时间轴</h2>
      <div class="header-actions">
        <a-select
          v-model="selectedYear"
          placeholder="选择年份"
          allow-clear
          style="width: 140px"
          size="small"
        >
          <a-option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年</a-option>
        </a-select>
        <a-radio-group v-model="viewMode" type="button" size="small">
          <a-radio value="year">按年</a-radio>
          <a-radio value="all">全部</a-radio>
        </a-radio-group>
      </div>
    </div>

    <div class="year-summary" v-if="yearData.length">
      <div class="summary-card">
        <div class="sc-num">{{ yearTotalPhotos }}</div>
        <div class="sc-label">照片</div>
      </div>
      <div class="summary-card">
        <div class="sc-num">{{ yearTotalVideos }}</div>
        <div class="sc-label">视频</div>
      </div>
      <div class="summary-card">
        <div class="sc-num">{{ yearTravelCount }}</div>
        <div class="sc-label">旅行</div>
      </div>
      <div class="summary-card">
        <div class="sc-num">{{ monthCount }}</div>
        <div class="sc-label">活跃月份</div>
      </div>
    </div>

    <div class="timeline-container" v-if="timelineGroups.length">
      <div v-for="(group, gIdx) in timelineGroups" :key="gIdx" class="tl-year-block">
        <div class="year-label">
          <div class="yl-num">{{ group.year }}</div>
          <div class="yl-line"></div>
        </div>
        <div class="year-content">
          <div v-for="(mItem, mIdx) in group.months" :key="mIdx" class="month-block">
            <div class="month-header">
              <div class="month-badge">
                <span class="month-num">{{ mItem.month }}</span>
                <span class="month-cn">月</span>
              </div>
              <div class="month-stats">
                <span>{{ mItem.items.length }} 个文件</span>
              </div>
            </div>
            <div class="month-items">
              <div v-if="mItem.items.length <= 6" class="items-inline">
                <MediaCard
                  v-for="(m, i) in mItem.items"
                  :key="m.id"
                  :media="m"
                  :style="{ '--delay': i * 0.03 + 's' }"
                  @click="openPreview(mItem, m)"
                />
              </div>
              <div v-else class="items-grid-wrap">
                <div class="items-main">
                  <MediaCard
                    v-for="(m, i) in mItem.items.slice(0, 5)"
                    :key="m.id"
                    :media="m"
                    @click="openPreview(mItem, m)"
                  />
                </div>
                <div class="more-btn" @click="expandMonth(mItem)">
                  <div class="more-icon">+{{ mItem.items.length - 5 }}</div>
                  <div class="more-text">更多</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 200 160" width="150" height="120">
          <defs>
            <linearGradient id="ts1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#e3f2f9"/>
              <stop offset="100%" style="stop-color:#a8d8ea"/>
            </linearGradient>
          </defs>
          <rect x="40" y="40" width="120" height="90" rx="10" fill="url(#ts1)"/>
          <line x1="60" y1="70" x2="140" y2="70" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <line x1="60" y1="90" x2="120" y2="90" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
          <line x1="60" y1="110" x2="100" y2="110" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          <circle cx="60" cy="70" r="4" fill="#c4a77d"/>
          <circle cx="120" cy="90" r="4" fill="#8bc9a0"/>
          <circle cx="100" cy="110" r="4" fill="#e8a5b9"/>
          <path d="M70 28 L70 42 M130 28 L130 42" stroke="#7eb8da" stroke-width="3" stroke-linecap="round"/>
          <rect x="62" y="28" width="76" height="14" rx="3" fill="#7eb8da"/>
          <path d="M100 40 L100 90 L140 90" stroke="#c4a77d" stroke-width="2" fill="none" stroke-dasharray="4,3" opacity="0.6"/>
        </svg>
      </div>
      <h3>暂无时间轴数据</h3>
      <p>导入更多照片来生成你的旅行时间线</p>
    </div>

    <a-modal
      v-model:visible="monthExpandVisible"
      :title="expandedMonth ? expandedMonth.year + '年' + expandedMonth.month + '月' : '月份详情'"
      width="900px"
      :footer="false"
    >
      <div class="expand-grid" v-if="expandedMonth">
        <MediaCard
          v-for="(m, i) in expandedMonth.items"
          :key="m.id"
          :media="m"
          @click="openPreview(expandedMonth, m)"
        />
      </div>
    </a-modal>

    <MediaPreview
      v-model="previewVisible"
      :media="currentMedia"
      :mediaList="flatMedia"
      :currentIndex="previewIndex"
      @change="(i) => previewIndex = i"
      @delete="loadData"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { groupByMonth, formatDate } from '@/utils'
import MediaCard from '@/components/MediaCard.vue'
import MediaPreview from '@/components/MediaPreview.vue'

const api = window.electronAPI

const media = ref([])
const travels = ref([])
const viewMode = ref('year')
const selectedYear = ref(new Date().getFullYear())
const previewVisible = ref(false)
const previewIndex = ref(0)
const currentFlatList = ref([])
const monthExpandVisible = ref(false)
const expandedMonth = ref(null)

const availableYears = computed(() => {
  const set = new Set()
  set.add(new Date().getFullYear())
  for (const m of media.value) {
    const d = m.taken_at || m.created_at
    if (d) set.add(new Date(d).getFullYear())
  }
  for (const t of travels.value) {
    if (t.start_date) set.add(new Date(t.start_date).getFullYear())
  }
  return Array.from(set).sort((a, b) => b - a)
})

const filteredMedia = computed(() => {
  if (viewMode.value === 'all' || !selectedYear.value) return media.value
  return media.value.filter(m => {
    const d = new Date(m.taken_at || m.created_at)
    return d.getFullYear() === selectedYear.value
  })
})

const yearTotalPhotos = computed(() => filteredMedia.value.filter(m => m.file_type === 'image').length)
const yearTotalVideos = computed(() => filteredMedia.value.filter(m => m.file_type === 'video').length)
const yearTravelCount = computed(() => {
  if (viewMode.value === 'all' || !selectedYear.value) return travels.value.length
  return travels.value.filter(t => {
    if (!t.start_date) return false
    return new Date(t.start_date).getFullYear() === selectedYear.value
  }).length
})
const monthCount = computed(() => {
  const set = new Set()
  for (const m of filteredMedia.value) {
    const d = new Date(m.taken_at || m.created_at)
    set.add(d.getMonth())
  }
  return set.size
})

const yearData = computed(() => filteredMedia.value)

const timelineGroups = computed(() => {
  const byYear = {}
  for (const m of filteredMedia.value) {
    const d = new Date(m.taken_at || m.created_at)
    const y = d.getFullYear()
    const mo = d.getMonth() + 1
    if (!byYear[y]) byYear[y] = {}
    if (!byYear[y][mo]) byYear[y][mo] = []
    byYear[y][mo].push(m)
  }
  const years = Object.keys(byYear).map(y => ({
    year: +y,
    months: Object.keys(byYear[y]).sort((a, b) => b - a).map(mo => ({
      month: +mo,
      year: +y,
      items: byYear[y][mo].sort((a, b) => {
        const da = new Date(a.taken_at || a.created_at)
        const db = new Date(b.taken_at || b.created_at)
        return db - da
      })
    }))
  })).sort((a, b) => b.year - a.year)
  return years
})

const flatMedia = computed(() => currentFlatList.value)
const currentMedia = computed(() => flatMedia.value[previewIndex.value] || null)

const openPreview = (mItem, m) => {
  currentFlatList.value = mItem.items
  previewIndex.value = mItem.items.findIndex(x => x.id === m.id)
  previewVisible.value = true
}

const expandMonth = (mItem) => {
  expandedMonth.value = mItem
  monthExpandVisible.value = true
}

const loadData = async () => {
  media.value = await api.media.list({ limit: 2000 })
  travels.value = await api.travel.list()
}

onMounted(loadData)
watch(viewMode, loadData)
watch(selectedYear, loadData)
</script>

<style lang="less" scoped>
.timeline-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    .section-title { margin: 0; }
  }
  .header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .year-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .summary-card {
    background: #fff;
    border: 1px solid #f0ebe3;
    border-radius: 14px;
    padding: 18px;
    text-align: center;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #7eb8da, #c4a77d);
    }

    .sc-num {
      font-size: 30px;
      font-weight: 700;
      color: #5a9fc4;
      line-height: 1;
      font-family: 'Segoe UI', sans-serif;
    }
    .sc-label {
      font-size: 12px;
      color: #8a8a8a;
      margin-top: 8px;
      letter-spacing: 1px;
    }
  }

  .timeline-container {
    position: relative;
  }

  .tl-year-block {
    display: flex;
    gap: 24px;
    margin-bottom: 36px;
  }

  .year-label {
    width: 80px;
    flex-shrink: 0;
    position: relative;
    .yl-num {
      font-size: 26px;
      font-weight: 700;
      color: #c4a77d;
      font-family: 'Georgia', serif;
    }
    .yl-line {
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, #c4a77d, transparent);
      margin-top: 6px;
    }
  }

  .year-content {
    flex: 1;
    min-width: 0;
  }

  .month-block {
    margin-bottom: 24px;
  }

  .month-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
  }

  .month-badge {
    background: linear-gradient(135deg, #a8d8ea, #7eb8da);
    color: #fff;
    padding: 4px 14px;
    border-radius: 18px;
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    box-shadow: 0 3px 10px rgba(126, 184, 218, 0.3);
    .month-num { font-size: 16px; font-weight: 700; }
    .month-cn { font-size: 11px; opacity: 0.85; }
  }

  .month-stats {
    font-size: 11px;
    color: #a88a5c;
    background: #f5efe0;
    padding: 2px 10px;
    border-radius: 10px;
  }

  .items-inline {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }

  .items-grid-wrap {
    display: flex;
    gap: 10px;
    align-items: stretch;
  }

  .items-main {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
  }

  .more-btn {
    width: 150px;
    flex-shrink: 0;
    background: linear-gradient(135deg, #f5efe0, #efe5d0);
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #a88a5c;
    transition: all 0.2s ease;
    border: 2px dashed transparent;

    &:hover {
      border-color: #c4a77d;
      background: #fffaf0;
    }

    .more-icon {
      font-size: 28px;
      font-weight: 700;
    }
    .more-text {
      font-size: 12px;
    }
  }

  .expand-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    max-height: 70vh;
    overflow-y: auto;
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: #8a8a8a;
    .empty-icon { opacity: 0.85; margin-bottom: 18px; }
    h3 { font-size: 18px; color: #4a4a4a; margin: 0 0 8px; }
    p { font-size: 13px; margin: 0; }
  }
}
</style>
