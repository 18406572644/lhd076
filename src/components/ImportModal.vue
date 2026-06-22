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
        <a-button type="primary" size="large" :icon="iconFile" @click="handleSelectFiles" block>
          选择文件
        </a-button>
        <a-divider style="margin: 16px 0">或</a-divider>
        <a-button type="outline" size="large" :icon="iconFolder" @click="handleSelectFolder" block>
          选择文件夹（批量导入）
        </a-button>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*,video/*"
          style="display: none"
          @change="onFileInputChange"
        />
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

const fileInputRef = ref(null)
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
      if (window.electronAPI && typeof window.electronAPI.readFile === 'function') {
        window.electronAPI.readFile(filePath).then(buffer => {
          const ext = getFileExt(filePath)
          const mime = getMime(ext)
          const blob = new Blob([buffer], { type: mime })
          reader.readAsDataURL(blob)
        }).catch(() => resolve(null))
      } else {
        resolve(null)
      }
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

const handleSelectFiles = async () => {
  try {
    if (window.electronAPI && typeof window.electronAPI.selectFiles === 'function') {
      const result = await window.electronAPI.selectFiles()
      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        await processFiles(result.filePaths)
        return
      }
      if (result && result.canceled) return
    }
  } catch (e) {
    console.warn('Electron 文件选择失败，回退到浏览器方式:', e.message)
  }
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const handleSelectFolder = async () => {
  try {
    if (window.electronAPI && typeof window.electronAPI.selectFolder === 'function') {
      const result = await window.electronAPI.selectFolder()
      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        const folder = result.filePaths[0]
        Message.info('文件夹扫描功能开发中，请使用选择文件方式')
        return
      }
      if (result && result.canceled) return
    }
  } catch (e) {
    console.warn('文件夹选择失败:', e.message)
  }
  Message.info('浏览器环境暂不支持文件夹选择，请使用选择文件方式')
}

const onFileInputChange = async (e) => {
  const files = e.target.files
  if (!files || !files.length) return
  const items = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = getFileExt(file.name)
    const type = getFileType(file.name)
    let preview = null
    if (type === 'image') {
      try {
        preview = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (ev) => resolve(ev.target.result)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(file)
        })
      } catch (e) {
        preview = null
      }
    }
    items.push({
      path: file.name,
      name: file.name,
      size: file.size,
      type,
      ext,
      preview,
      _browserFile: file
    })
  }
  previewList.value = [...previewList.value, ...items]
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const processFiles = async (paths) => {
  const items = []
  for (const p of paths) {
    try {
      let stat = { size: 0 }
      if (window.electronAPI && typeof window.electronAPI.statFile === 'function') {
        stat = await window.electronAPI.statFile(p)
      }
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
        size: stat ? stat.size : 0,
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

  if (!window.electronAPI) {
    Message.error('导入功能需要在 Electron 环境中运行')
    return
  }

  importing.value = true
  currentIndex.value = 0

  let mediaDir = ''
  try {
    const paths = await window.electronAPI.getPaths()
    mediaDir = paths && paths.mediaDir ? paths.mediaDir : ''
  } catch (e) {
    console.error('获取媒体目录失败:', e)
    Message.error('获取媒体目录失败，请重试')
    importing.value = false
    return
  }

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

      try {
        if (window.electronAPI.copyFile) {
          await window.electronAPI.copyFile(item.path, destPath)
        }
      } catch (copyErr) {
        console.warn('文件复制失败，跳过:', item.name, copyErr.message)
        continue
      }

      let exifData = {}
      if (formData.value.readExif && item.type === 'image' && window.electronAPI.readFile) {
        try {
          const buffer = await window.electronAPI.readFile(item.path)
          const uint8 = new Uint8Array(buffer)
          exifData = await exifr.parse(uint8, {
            gps: true,
            exif: true,
            xmp: true
          }) || {}
        } catch (e) {
          console.warn('EXIF 解析失败:', e.message)
        }
      }

      let takenAt = null
      let latitude = null
      let longitude = null
      let camera = null
      let width = null
      let height = null

      if (exifData && exifData.DateTimeOriginal) {
        takenAt = new Date(exifData.DateTimeOriginal).toISOString()
      }
      if (exifData && exifData.latitude !== undefined) latitude = exifData.latitude
      if (exifData && exifData.longitude !== undefined) longitude = exifData.longitude
      if (exifData && (exifData.Make || exifData.Model)) {
        camera = [exifData.Make, exifData.Model].filter(Boolean).join(' ')
      }
      if (exifData && exifData.ImageWidth) width = exifData.ImageWidth
      if (exifData && exifData.ImageHeight) height = exifData.ImageHeight

      mediaItems.push({
        travel_id: formData.value.travelId || null,
        file_name: destName,
        original_name: item.name,
        file_path: destPath,
        file_size: item.size || 0,
        file_type: item.type || 'image',
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

    if (mediaItems.length === 0) {
      Message.warning('没有成功导入的文件')
      return
    }

    const ids = await mediaStore.bulkCreateMedia(mediaItems)
    Message.success(`成功导入 ${ids.length} 个文件`)
    emit('success', ids)

    previewList.value = []
    visible.value = false
  } catch (e) {
    console.error('Import failed:', e)
    Message.error('导入失败：' + (e && e.message ? e.message : '未知错误'))
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
