<template>
  <a-modal
    v-model:visible="visible"
    width="900px"
    :footer="false"
    :title="title"
    unmount-on-close
  >
    <div class="media-preview" v-if="media">
      <div class="preview-main">
        <div class="preview-area">
          <template v-if="media.file_type === 'image'">
            <img :src="imgSrc" @error="imgError = true" />
          </template>
          <template v-else-if="media.file_type === 'video'">
            <video :src="imgSrc" controls autoplay></video>
          </template>
          <template v-else>
            <div class="file-preview">
              <icon-file :size="64" />
              <div>{{ media.original_name || media.file_name }}</div>
            </div>
          </template>
        </div>
        <div class="preview-nav" v-if="navigable">
          <a-button type="text" :icon="iconLeft" @click="prev" :disabled="!hasPrev">上一张</a-button>
          <span class="nav-count">{{ currentIndex + 1 }} / {{ total }}</span>
          <a-button type="text" @click="next" :disabled="!hasNext">下一张 <icon-right /></a-button>
        </div>
      </div>
      <div class="preview-side">
        <div class="info-section">
          <div class="section-title">基本信息</div>
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="标题">
              <a-input v-if="editing.title" v-model="editForm.title" size="mini" />
              <span v-else @dblclick="startEdit('title')">{{ media.title || '未命名' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="文件名">
              <span class="text-sm" :title="media.original_name || media.file_name">
                {{ media.original_name || media.file_name }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="类型">
              <a-tag v-if="media.file_type === 'image'" color="green">照片</a-tag>
              <a-tag v-else-if="media.file_type === 'video'" color="pink">视频</a-tag>
              <a-tag v-else color="gray">其他</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="拍摄时间">
              <a-date-picker v-if="editing.taken_at" v-model="editForm.taken_at" style="width: 100%" size="mini" value-format="YYYY-MM-DD" />
              <span v-else @dblclick="startEdit('taken_at')">{{ formatDateTime(media.taken_at) || '未知' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="地点">
              <a-input v-if="editing.location" v-model="editForm.location" size="mini" />
              <span v-else @dblclick="startEdit('location')">{{ media.location || '未知' }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="坐标" v-if="media.latitude && media.longitude">
              {{ media.latitude?.toFixed(5) }}, {{ media.longitude?.toFixed(5) }}
            </a-descriptions-item>
            <a-descriptions-item label="相机" v-if="media.camera">{{ media.camera }}</a-descriptions-item>
            <a-descriptions-item label="尺寸" v-if="media.width && media.height">
              {{ media.width }} × {{ media.height }}
            </a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatFileSize(media.file_size) }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="info-section">
          <div class="section-title">标签与备注</div>
          <div class="tags-edit">
            <a-select
              mode="tags"
              v-model="editForm.tags"
              placeholder="添加标签"
              :allow-clear="true"
              style="width: 100%"
              size="small"
              @change="onTagsChange"
            >
              <a-option v-for="t in allTags" :key="t" :value="t">{{ t }}</a-option>
            </a-select>
          </div>
          <div style="margin-top: 10px;">
            <a-textarea
              v-model="editForm.description"
              placeholder="添加备注..."
              :auto-size="{ minRows: 3, maxRows: 5 }"
              size="small"
              @change="onDescChange"
            />
          </div>
        </div>

        <div class="info-section">
          <div class="section-title">收藏</div>
          <a-switch v-model="isFavorite" @change="onFavoriteChange" type="line" />
        </div>

        <div class="info-section">
          <div class="section-title">关联</div>
          <a-form layout="vertical" size="mini">
            <a-form-item label="所属旅行">
              <a-select v-model="editForm.travel_id" allow-clear placeholder="选择旅行" @change="saveForm">
                <a-option v-for="t in travels" :key="t.id" :value="t.id">{{ t.title }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="加入相册">
              <a-select mode="multiple" v-model="selectedAlbums" allow-clear placeholder="选择相册" @change="onAlbumsChange">
                <a-option v-for="a in albums" :key="a.id" :value="a.id">{{ a.title }}</a-option>
              </a-select>
            </a-form-item>
          </a-form>
        </div>

        <div class="side-actions">
          <a-button type="outline" :icon="iconDownload" @click="handleDownload">下载</a-button>
          <a-button :icon="iconFolder" @click="showInFolder">定位</a-button>
          <a-popconfirm
            content="确定要删除这个文件吗？"
            position="br"
            @ok="handleDelete"
          >
            <a-button status="danger" type="outline" :icon="iconDelete">删除</a-button>
          </a-popconfirm>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconFile,
  IconLeft,
  IconRight,
  IconDownload,
  IconFolder,
  IconDelete
} from '@arco-design/web-vue/es/icon'
import { formatDateTime, formatFileSize, parseTags } from '@/utils'

const props = defineProps({
  modelValue: Boolean,
  media: Object,
  mediaList: Array,
  currentIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'update:media', 'change', 'delete'])

const iconFile = IconFile
const iconLeft = IconLeft
const iconRight = IconRight
const iconDownload = IconDownload
const iconFolder = IconFolder
const iconDelete = IconDelete

const api = window.electronAPI

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const navigable = computed(() => Array.isArray(props.mediaList) && props.mediaList.length > 1)
const total = computed(() => props.mediaList?.length || 0)
const hasPrev = computed(() => props.currentIndex > 0)
const hasNext = computed(() => props.currentIndex < total.value - 1)

const imgSrc = computed(() => {
  if (!props.media?.file_path) return ''
  return 'file:///' + props.media.file_path.replace(/\\/g, '/')
})

const title = computed(() => props.media?.title || props.media?.original_name || '预览')

const imgError = ref(false)
const travels = ref([])
const albums = ref([])
const allTags = ref([])

const editing = reactive({ title: false, taken_at: false, location: false })
const editForm = reactive({
  title: '',
  taken_at: '',
  location: '',
  description: '',
  tags: [],
  travel_id: undefined
})

const isFavorite = ref(false)
const selectedAlbums = ref([])

watch(() => props.media, (m) => {
  if (!m) return
  editForm.title = m.title || ''
  editForm.taken_at = m.taken_at ? m.taken_at.slice(0, 10) : ''
  editForm.location = m.location || ''
  editForm.description = m.description || ''
  editForm.tags = parseTags(m.tags)
  editForm.travel_id = m.travel_id || undefined
  isFavorite.value = !!m.is_favorite
  Object.keys(editing).forEach(k => editing[k] = false)
}, { immediate: true })

watch(visible, async (v) => {
  if (v) {
    travels.value = await api.travel.list()
    albums.value = await api.album.list()
    allTags.value = await api.tags.list()
    loadAlbumRelations()
  }
})

const loadAlbumRelations = async () => {
  if (!props.media?.id) return
  selectedAlbums.value = []
  for (const a of albums.value) {
    const items = await api.media.getByAlbum(a.id)
    if (items.some(i => i.id === props.media.id)) {
      selectedAlbums.value.push(a.id)
    }
  }
}

const startEdit = (field) => { editing[field] = true }

const saveForm = async () => {
  if (!props.media?.id) return
  try {
    await api.media.update(props.media.id, { ...editForm })
    const updated = { ...props.media, ...editForm, tags: JSON.stringify(editForm.tags) }
    emit('update:media', updated)
  } catch (e) {
    console.error(e)
  }
}

const onTagsChange = () => saveForm()
const onDescChange = () => saveForm()

const onFavoriteChange = async () => {
  await api.media.update(props.media.id, { is_favorite: isFavorite.value ? 1 : 0 })
}

const onAlbumsChange = async (val) => {
  if (!props.media?.id) return
  const prev = new Set(selectedAlbums.value)
  const next = new Set(val)
  for (const id of next) {
    if (!prev.has(id)) {
      await api.media.addToAlbum(props.media.id, id)
    }
  }
  for (const id of prev) {
    if (!next.has(id)) {
      await api.media.removeFromAlbum(props.media.id, id)
    }
  }
}

const prev = () => emit('change', props.currentIndex - 1)
const next = () => emit('change', props.currentIndex + 1)

const handleDownload = async () => {
  const result = await api.saveDialog({
    defaultPath: props.media.original_name || props.media.file_name
  })
  if (result.canceled || !result.filePath) return
  try {
    await api.copyFile(props.media.file_path, result.filePath)
    Message.success('已导出')
  } catch (e) {
    Message.error('导出失败')
  }
}

const showInFolder = () => {
  api.showItemInFolder(props.media.file_path)
}

const handleDelete = async () => {
  await api.media.delete(props.media.id)
  Message.success('已删除')
  emit('delete', props.media.id)
  visible.value = false
}
</script>

<style lang="less" scoped>
.media-preview {
  display: flex;
  gap: 20px;
  min-height: 520px;
}

.preview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-area {
  flex: 1;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 440px;

  img, video {
    max-width: 100%;
    max-height: 480px;
    object-fit: contain;
  }
}

.file-preview {
  color: #fff;
  opacity: 0.7;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px 0;
  color: #8a8a8a;
}

.nav-count {
  font-size: 13px;
  font-weight: 600;
  color: #5a9fc4;
}

.preview-side {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.info-section {
  background: #faf6f0;
  border-radius: 10px;
  padding: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #a88a5c;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.text-sm {
  font-size: 12px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

:deep(.arco-descriptions-item-label) {
  width: 80px !important;
}
</style>
