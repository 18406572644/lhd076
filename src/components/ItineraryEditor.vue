<template>
  <div class="itinerary-editor">
    <div class="it-header">
      <div class="it-title">
        <icon-calendar :size="16" style="color: #7eb8da" />
        <span>共 {{ days }} 天行程</span>
      </div>
      <div class="it-actions">
        <a-button size="small" @click="addDay" :icon="iconPlus">增加一天</a-button>
        <a-button size="small" type="primary" @click="addItem" :icon="iconAdd">添加行程</a-button>
      </div>
    </div>

    <div class="days-tabs" v-if="dayList.length">
      <div
        v-for="d in dayList"
        :key="d"
        class="day-tab"
        :class="{ active: currentDay === d }"
        @click="currentDay = d"
      >
        <span class="day-num">D{{ d }}</span>
        <span class="day-count">{{ getDayItems(d).length }}项</span>
      </div>
    </div>

    <div class="timeline-list">
      <div v-if="currentItems.length === 0" class="empty-day">
        <div class="empty-icon">📋</div>
        <div>这一天还没有安排</div>
        <a-button type="outline" size="small" @click="addItem" style="margin-top: 8px">
          添加第一个行程
        </a-button>
      </div>
      <div
        v-for="(item, idx) in currentItems"
        :key="item.id"
        class="tl-item"
      >
        <div class="tl-line">
          <div class="tl-dot" :style="{ background: getSlotColor(item.time_slot) }"></div>
        </div>
        <div class="tl-card">
          <div class="tl-head">
            <a-tag :color="getSlotTagColor(item.time_slot)" size="small" class="slot-tag">
              {{ slotNames[item.time_slot] || '全天' }}
            </a-tag>
            <div class="tl-actions">
              <a-button type="text" size="mini" @click="editItem(item)"><icon-edit :size="12" /></a-button>
              <a-popconfirm content="删除?" position="br" @ok="removeItem(item.id)">
                <a-button type="text" size="mini" status="danger"><icon-delete :size="12" /></a-button>
              </a-popconfirm>
            </div>
          </div>
          <div class="tl-title">{{ item.title }}</div>
          <div class="tl-meta" v-if="item.location || item.latitude">
            <span v-if="item.location"><icon-location :size="11" /> {{ item.location }}</span>
          </div>
          <div class="tl-desc" v-if="item.description">{{ item.description }}</div>
        </div>
      </div>
    </div>

    <a-modal
      v-model:visible="formVisible"
      :title="editing ? '编辑行程' : '添加行程'"
      width="480px"
      @ok="saveItem"
      @cancel="formVisible = false"
      unmount-on-close
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="行程天数">
          <a-input-number v-model="form.day_index" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="时段">
          <a-select v-model="form.time_slot" style="width: 100%">
            <a-option v-for="(name, key) in slotNames" :key="key" :value="key">{{ name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="行程标题" required>
          <a-input v-model="form.title" placeholder="如：参观洱海" allow-clear />
        </a-form-item>
        <a-form-item label="地点">
          <a-space direction="vertical" style="width: 100%">
            <a-input v-model="form.location" placeholder="地点名称" allow-clear />
            <a-space>
              <a-input-number v-model="form.latitude" placeholder="纬度" :precision="6" style="width: 48%" />
              <a-input-number v-model="form.longitude" placeholder="经度" :precision="6" style="width: 48%" />
            </a-space>
          </a-space>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model="form.description" :auto-size="{ minRows: 3, maxRows: 5 }" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconCalendar,
  IconPlus,
  IconEdit,
  IconDelete,
  IconLocation
} from '@arco-design/web-vue/es/icon'
import { getDateRange } from '@/utils'

const props = defineProps({
  travelId: { type: [Number, String], required: true },
  travel: Object
})

const emit = defineEmits(['change'])

const api = window.electronAPI

const iconCalendar = IconCalendar
const iconPlus = IconPlus
const iconAdd = IconPlus
const iconEdit = IconEdit
const iconDelete = IconDelete
const iconLocation = IconLocation

const slotNames = {
  morning: '上午',
  noon: '中午',
  afternoon: '下午',
  evening: '晚上',
  all: '全天'
}

const slotColors = {
  morning: '#a8d8ea',
  noon: '#f2d59e',
  afternoon: '#c4a77d',
  evening: '#b59ad6',
  all: '#8bc9a0'
}

const getSlotColor = (s) => slotColors[s] || '#8bc9a0'
const getSlotTagColor = (s) => {
  const map = { morning: 'arcoblue', noon: 'yellow', afternoon: 'orangered', evening: 'purple', all: 'green' }
  return map[s] || 'gray'
}

const itinerary = ref([])
const currentDay = ref(1)
const formVisible = ref(false)
const editing = ref(null)

const form = reactive({
  day_index: 1,
  time_slot: 'morning',
  title: '',
  location: '',
  latitude: undefined,
  longitude: undefined,
  description: ''
})

const days = computed(() => {
  if (!itinerary.value.length) return 1
  return Math.max(...itinerary.value.map(i => i.day_index || 1), currentDay.value)
})

const dayList = computed(() => {
  return Array.from({ length: days.value }, (_, i) => i + 1)
})

const currentItems = computed(() => {
  const order = ['morning', 'noon', 'afternoon', 'evening', 'all']
  return itinerary.value
    .filter(i => (i.day_index || 1) === currentDay.value)
    .sort((a, b) => {
      const oa = order.indexOf(a.time_slot)
      const ob = order.indexOf(b.time_slot)
      if (oa !== ob) return oa - ob
      return (a.sort_order || 0) - (b.sort_order || 0)
    })
})

const getDayItems = (d) => itinerary.value.filter(i => (i.day_index || 1) === d)

const load = async () => {
  itinerary.value = await api.itinerary.list(props.travelId)
  if (itinerary.value.length && currentDay.value > days.value) {
    currentDay.value = days.value
  }
  emit('change')
}

const addDay = () => {
  currentDay.value = days.value + 1
}

const resetForm = () => {
  Object.assign(form, {
    day_index: currentDay.value,
    time_slot: 'morning',
    title: '',
    location: '',
    latitude: undefined,
    longitude: undefined,
    description: ''
  })
}

const addItem = () => {
  resetForm()
  editing.value = null
  formVisible.value = true
}

const editItem = (item) => {
  editing.value = item
  Object.assign(form, {
    day_index: item.day_index || 1,
    time_slot: item.time_slot || 'morning',
    title: item.title,
    location: item.location || '',
    latitude: item.latitude,
    longitude: item.longitude,
    description: item.description || ''
  })
  formVisible.value = true
}

const saveItem = async () => {
  if (!form.title.trim()) {
    Message.warning('请输入行程标题')
    return
  }
  try {
    if (editing.value) {
      await api.itinerary.update(editing.value.id, { ...form })
      Message.success('已更新')
    } else {
      await api.itinerary.create({ travel_id: props.travelId, ...form })
      Message.success('已添加')
    }
    formVisible.value = false
    await load()
  } catch (e) {
    Message.error('操作失败')
  }
}

const removeItem = async (id) => {
  await api.itinerary.delete(id)
  await load()
}

watch(() => props.travelId, load, { immediate: true })
</script>

<style lang="less" scoped>
.it-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.it-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #4a4a4a;
  font-size: 14px;
}

.it-actions {
  display: flex;
  gap: 8px;
}

.days-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 20px;
}

.day-tab {
  flex-shrink: 0;
  padding: 8px 16px;
  background: #f5efe6;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s ease;
  min-width: 68px;

  &:hover {
    background: #efe5d0;
  }

  &.active {
    background: linear-gradient(135deg, #7eb8da, #a8d8ea);
    color: #fff;
  }

  .day-num {
    font-weight: 700;
    font-size: 14px;
  }

  .day-count {
    font-size: 10px;
    opacity: 0.7;
    margin-top: 2px;
  }
}

.timeline-list {
  position: relative;
  padding-left: 28px;

  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: linear-gradient(180deg, #a8d8ea, #c4a77d);
    border-radius: 1px;
  }
}

.tl-item {
  position: relative;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.tl-line {
  position: absolute;
  left: -28px;
  top: 12px;
  width: 18px;
  display: flex;
  justify-content: center;
}

.tl-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  position: relative;
  z-index: 1;
}

.tl-card {
  flex: 1;
  background: #fff;
  border: 1px solid #f0ebe3;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.tl-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slot-tag {
  margin: 0;
}

.tl-actions {
  display: flex;
  gap: 4px;
}

.tl-title {
  font-weight: 600;
  color: #4a4a4a;
  font-size: 15px;
  margin-bottom: 6px;
}

.tl-meta {
  font-size: 12px;
  color: #7eb8da;
  margin-bottom: 6px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.tl-desc {
  font-size: 12px;
  color: #8a8a8a;
  line-height: 1.6;
}

.empty-day {
  text-align: center;
  padding: 40px 20px;
  color: #b0b0b0;
  background: #faf6f0;
  border-radius: 12px;

  .empty-icon {
    font-size: 36px;
    margin-bottom: 10px;
  }
}
</style>
