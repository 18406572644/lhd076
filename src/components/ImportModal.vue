<template>
  <a-modal
    v-model:visible="visible"
    title="导入照片与视频"
    width="640px"
    :ok-text="'开始导入'"
    :cancel-text="'取消'"
    @ok="handleImport"
    @cancel="visible = false"
    :ok-loading="importing"
  >
    <div class="import-modal">
      <div class="import-actions">
        <a-button type="primary" size="large" :icon="iconFile" @click="selectFiles" block>
          选择文件
        </a-button>
        <a-divider style="margin: 16px 0">或</a-divider>
        <a-button type="outline" size="large" :icon="iconFolder" @click="selectFolder" block>
          选择文件夹（批量导入）
        </a-button>
      </div>

      <div v-if="previewList.length > 0" class="preview-section">
        <div class="preview-header">
          <span class="preview-title">已选择 {{ previewList.length }} 个文件</span>
          <a-button type="text" size="mini" @click="clearFiles">清空</a-button>
        </div>
        <div class="preview-grid">
          <div
            v-for="(item, idx) in previewList.slice(0, 20)"
            :key="idx"
            class="preview-item"
          >
            <div class="preview-thumb">
              <template v-if="item.type === 'image'">
                <img :src="item.preview" alt="" />
              </template>
              <template v-else-if="item.type === 'video'">
                <div class="video-placeholder">
                  <icon-play-circle :size="20" />
                </div>
              </template>
              <template v-else>
                <div class="file-placeholder">
                  <icon-file :size="16" />
                </div>
              </template>
            </div>
            <div class="preview-name" :title="item.name">{{ item.name }}</div>
          </div>
          <div v-if="previewList.length > 20" class="preview-more">
            +{{ previewList.length - 20 }}
          </div>
        </div>
      </div>

      <a-divider />

      <a-form layout="vertical" :model="formData">
        <a-form-item label="分类到旅行">
          <a-select
            v-model="formData.travelId"
            placeholder="选择旅行（可选）"
            allow-clear
          >
            <a-option v-for="t in travels" :key="t.id" :value="t.id">
              {{ t.title }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="添加标签">
          <a-input
            v-model="formData.tags"
            placeholder="用逗号分隔多个标签，如：风景,人像,美食"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="自动分类">
          <a-space wrap>
            <a-checkbox v-model="formData.autoByTime">按拍摄时间自动分类</a-checkbox>
            <a-checkbox v-model="formData.autoByLocation">按地理位置分类</a-checkbox>
            <a-checkbox v-model="formData.readExif">读取 EXIF 信息</a-checkbox>
          </a-space>
        </a-form-item>
      </a-form>

      <div v-if="importing" class="import-progress">
        <a-progress :percent="progressPercent" :status="'normal'" />
        <div class="progress-text">
          正在导入 {{ currentIndex }} / {{ previewList.length }}...
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconFile,
  IconFolder,
  IconPlayCircle
} from '@arco-design/web-vue/es/icon'
import { getFileType, getFileExt } from '@/utils'
import { useTravelStore } from '@/stores/travel'
import { useMediaStore } from '@/stores/media'
import { useAppStore } from '@/stores/app'
import exifr from 'exifr'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps({
  modelValue: Boolean,
  defaultTravelId: [Number, String]
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const iconFile = IconFile
const iconFolder = IconFolder
const iconPlay = IconPlayCircle

const travelStore = useTravelStore()
const mediaStore = useMediaStore()
const appStore = useAppStore()

const fileList = ref([])
const previewList = ref([])
const importing = ref(false)
const currentIndex = ref(0)
const travels = computed(() => travelStore.travels)

const formData = ref({
  travelId: undefined,
  tags: '',
  autoByTime: true,
  autoByLocation: true,
  readExif: true
})

const progressPercent = computed(() => {
  if (previewList.value.length === 0) return 0
  return Math.round((currentIndex.value / previewList.value.length) * 100)
})

watch(() => props.defaultTravelId, (val) => {
  if (val) formData.value.travelId = val
})

watch(visible, async (v) => {
  if (v) {
    try {
      await travelStore.fetchTravels()
    } catch (e) {
      console.warn('加载旅行列表失败:', e)
    }
  }
})

onMounted(async () => {
  try {
    await travelStore.fetchTravels()
  } catch (e) {
    console.warn('加载旅行列表失败:', e)
  }
})

const readFileAsDataURL = (filePath) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => resolve(null)
    try {
      window.electronAPI.readFile(filePath).then(buffer => {
        const ext = getFileExt(filePath)
        const mime = getMime(ext)
        const blob = new Blob([buffer], { type: mime })
        reader.readAsDataURL(blob)
      }).catch(() => resolve(null))
    } catch (e) {
      resolve(null)
    }
  })
}

const getMime = (ext) => {
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    heic: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska'
  }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

const selectFiles = async () => {
  const result = await window.electronAPI.selectFiles()
  if (result.canceled || !result.filePaths?.length) return
  await processFiles(result.filePaths)
}

const selectFolder = async () => {
  const result = await window.electronAPI.selectFolder()
  if (result.canceled || !result.filePaths?.length) return
  const folder = result.filePaths[0]
  Message.warning('文件夹扫描将在主进程完成，此处演示选择功能')
}

const processFiles = async (paths) => {
  const api = window.electronAPI
  const items = []
  for (const p of paths) {
    try {
      const stat = await api.statFile(p)
      const ext = getFileExt(p)
      const type = getFileType(p)
      const name = p.split(/[\\/]/).pop()
      let preview = null
      if (type === 'image') {
        preview = await readFileAsDataURL(p)
      }
      items.push({
        path: p,
        name,
        size: stat.size,
        type,
        ext,
        preview
      })
    } catch (e) {
      console.error('Process file error:', p, e)
    }
  }
  previewList.value = [...previewList.value, ...items]
}

const clearFiles = () => {
  previewList.value = []
  fileList.value = []
}

const handleImport = async () => {
  if (previewList.value.length === 0) {
    Message.warning('请先选择要导入的文件')
    return
  }
  importing.value = true
  currentIndex.value = 0
  const api = window.electronAPI
  const paths = await api.getPaths()
  const mediaDir = paths.mediaDir

  const tags = formData.value.tags
    ? formData.value.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    : []

  try {
    const mediaItems = []
    for (let i = 0; i < previewList.value.length; i++) {
      const item = previewList.value[i]
      currentIndex.value = i + 1

      const uuid = uuidv4().slice(0, 12)
      const destName = `${Date.now()}_${uuid}.${item.ext}`
      const destPath = `${mediaDir}\\${destName}`

      await api.copyFile(item.path, destPath)

      let exifData = {}
      if (formData.value.readExif && item.type === 'image') {
        try {
          const buffer = await api.readFile(item.path)
          const uint8 = new Uint8Array(buffer)
          exifData = await exifr.parse(uint8, {
            gps: true,
            exif: true,
            xmp: true
          }) || {}
        } catch (e) {
          console.warn('EXIF parse failed:', e)
        }
      }

      let takenAt = null
      let latitude = null
      let longitude = null
      let camera = null
      let width = null
      let height = null

      if (exifData.DateTimeOriginal) {
        takenAt = new Date(exifData.DateTimeOriginal).toISOString()
      }
      if (exifData.latitude !== undefined) latitude = exifData.latitude
      if (exifData.longitude !== undefined) longitude = exifData.longitude
      if (exifData.Make || exifData.Model) {
        camera = [exifData.Make, exifData.Model].filter(Boolean).join(' ')
      }
      if (exifData.ImageWidth) width = exifData.ImageWidth
      if (exifData.ImageHeight) height = exifData.ImageHeight

      mediaItems.push({
        travel_id: formData.value.travelId || null,
        file_name: destName,
        original_name: item.name,
        file_path: destPath,
        file_size: item.size,
        file_type: item.type,
        mime_type: getMime(item.ext),
        width,
        height,
        taken_at: takenAt,
        latitude,
        longitude,
        camera,
        tags: tags.length ? tags : null
      })
    }

    const ids = await mediaStore.bulkCreateMedia(mediaItems)
    Message.success(`成功导入 ${ids.length} 个文件`)
    emit('success', ids)

    previewList.value = []
    visible.value = false
  } catch (e) {
    console.error('Import failed:', e)
    Message.error('导入失败：' + e.message)
  } finally {
    importing.value = false
    currentIndex.value = 0
  }
}
</script>

<style lang="less" scoped>
.import-modal {
  .import-actions {
    padding: 8px 0;
  }

  .preview-section {
    margin-top: 20px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .preview-title {
    font-weight: 600;
    color: #4a4a4a;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
    background: #faf6f0;
    border-radius: 8px;
  }

  .preview-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-thumb {
    width: 100%;
    aspect-ratio: 1;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .video-placeholder,
  .file-placeholder {
    background: linear-gradient(135deg, #a8d8ea, #7eb8da);
    color: #fff;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-placeholder {
    background: linear-gradient(135deg, #c4a77d, #a88a5c);
  }

  .preview-name {
    font-size: 10px;
    color: #8a8a8a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .preview-more {
    aspect-ratio: 1;
    border-radius: 6px;
    background: #e8e0d4;
    color: #8a8a8a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
  }

  .import-progress {
    margin-top: 16px;
    .progress-text {
      text-align: center;
      margin-top: 8px;
      font-size: 13px;
      color: #7eb8da;
    }
  }
}
</style>
