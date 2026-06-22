<template>
  <a-modal
    v-model:visible="selectorVisible"
    @ok="handleConfirm"
    @cancel="selectorVisible = false"
    ok-text="确认选择"
    :ok-button-props="{ disabled: selected.length === 0 }"
    :width="'900px'"
    unmount-on-close
    title="选择媒体文件"
  >
    <div class="media-selector">
      <div class="selector-toolbar">
        <div class="st-left">
          <a-radio-group v-model="filterType" type="button" size="small">
            <a-radio value="all">全部</a-radio>
            <a-radio value="image">仅照片</a-radio>
            <a-radio value="video">仅视频</a-radio>
          </a-radio-group>
          <a-input-search
            v-model="search"
            placeholder="搜索..."
            size="small"
            style="width: 200px; margin-left: 12px;"
            allow-clear
          />
        </div>
        <div class="st-right">
          <a-checkbox :model-value="isAllSelected" @change="toggleAll">全选</a-checkbox>
          <span style="margin-left: 12px; color: #5a9fc4; font-size: 13px;">
            已选 {{ selected.length }} 个
          </span>
        </div>
      </div>
      <div class="selector-grid">
        <div
          v-for="m in filteredList"
          :key="m.id"
          class="selector-item"
          :class="{ selected: selected.includes(m.id) }"
          @click="toggleItem(m)"
        >
          <div class="item-thumb" v-if="m.file_type === 'image'">
            <img :src="'file:///' + m.file_path.replace(/\\/g, '/')"
                 @error="e => e.target.style.opacity = 0" />
          </div>
          <div class="item-thumb video" v-else>
            <icon-play-circle :size="20" />
          </div>
          <div class="item-info">
            <div class="item-name" :title="m.original_name || m.file_name">
              {{ m.title || m.original_name || m.file_name }}
            </div>
            <div class="item-date">{{ formatDate(m.taken_at || m.created_at) }}</div>
          </div>
          <div class="item-check">
            <icon-check v-if="selected.includes(m.id)" />
          </div>
        </div>
        <a-empty v-if="!filteredList.length" description="没有匹配的文件" />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { IconPlayCircle, IconCheck } from '@arco-design/web-vue/es/icon'
import { formatDate } from '@/utils'

const api = window.electronAPI || {}

const iconPlay = IconPlayCircle
const iconCheck = IconCheck

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const selectorVisible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const allMedia = ref([])
const selected = ref([])
const search = ref('')
const filterType = ref('all')

const filteredList = computed(() => {
  let list = allMedia.value
  if (filterType.value !== 'all') list = list.filter(m => m.file_type === filterType.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(m =>
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.original_name && m.original_name.toLowerCase().includes(q))
    )
  }
  return list
})

const isAllSelected = computed(() => {
  if (!filteredList.value.length) return false
  return filteredList.value.every(m => selected.value.includes(m.id))
})

const toggleItem = m => {
  const i = selected.value.indexOf(m.id)
  if (i >= 0) {
    selected.value.splice(i, 1)
  } else {
    selected.value.push(m.id)
  }
}

const toggleAll = val => {
  if (val) {
    selected.value = filteredList.value.map(m => m.id)
  } else {
    selected.value = []
  }
}

const handleConfirm = () => {
  const items = allMedia.value.filter(m => selected.value.includes(m.id))
  emit('confirm', items)
  selectorVisible.value = false
}

const load = async () => {
  allMedia.value = await api.media.list({ limit: 500 })
}

watch(selectorVisible, v => {
  if (v) {
    selected.value = []
    load()
  }
})
</script>

<style lang="less" scoped>
.selector-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #faf6f0;
  border-radius: 10px;
  margin-bottom: 14px;
}

.st-left, .st-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-grid {
  max-height: 60vh;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.selector-item {
  position: relative;
  background: #fff;
  border: 2px solid #f0ebe3;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #a8d8ea;
    transform: translateY(-2px);
  }

  &.selected {
    border-color: #7eb8da;
    box-shadow: 0 4px 12px rgba(126, 184, 218, 0.25);
  }
}

.item-thumb {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &.video {
    background: linear-gradient(135deg, #dcc9a8, #c4a77d);
    color: #fff;
  }
}

.item-info {
  padding: 8px 10px;
}

.item-name {
  font-size: 12px;
  color: #4a4a4a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.item-date {
  font-size: 10px;
  color: #b0b0b0;
  margin-top: 2px;
}

.item-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  background: #7eb8da;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  animation: popIn 0.15s ease;
}
</style>
