<template>
  <div class="photo-book-editor" v-loading="loading">
    <div class="editor-header">
      <div class="header-left">
        <a-button type="text" :icon="iconBack" @click="$emit('close')">返回</a-button>
        <div class="book-title">
          <a-input
            v-model="bookTitle"
            :bordered="false"
            size="large"
            placeholder="输入照片书名称"
            @blur="saveBookTitle"
          />
        </div>
      </div>
      <div class="header-right">
        <a-space>
          <a-button :icon="iconUndo" disabled>撤销</a-button>
          <a-button :icon="iconRedo" disabled>重做</a-button>
          <a-divider type="vertical" />
          <a-button :icon="iconEye" @click="showPreview = true">预览</a-button>
          <a-button type="primary" :icon="iconDownload" @click="exportPDF">
            导出 PDF
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="editor-body">
      <div class="editor-sidebar left-sidebar">
        <a-tabs v-model:activeTab="activeTab" type="rounded" size="small">
          <a-tab-pane key="photos" title="照片">
            <div class="sidebar-content">
              <div class="add-photos-btn" @click="openMediaSelector">
                <icon-plus :size="18" />
                <span>添加照片</span>
              </div>
              <div class="photo-list">
                <div
                  v-for="m in availablePhotos"
                  :key="m.id"
                  class="photo-thumb"
                  draggable="true"
                  @dragstart="onPhotoDragStart($event, m)"
                  @click="addPhotoToPage(m)"
                >
                  <img :src="'file:///' + m.file_path.replace(/\\/g, '/')" />
                </div>
              </div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="text" title="文字">
            <div class="sidebar-content">
              <div class="text-presets">
                <div class="preset-item" @click="addTextElement('title')">
                  <div class="preset-preview title-style">标题文字</div>
                  <span>标题</span>
                </div>
                <div class="preset-item" @click="addTextElement('subtitle')">
                  <div class="preset-preview subtitle-style">副标题</div>
                  <span>副标题</span>
                </div>
                <div class="preset-item" @click="addTextElement('body')">
                  <div class="preset-preview body-style">正文内容...</div>
                  <span>正文</span>
                </div>
                <div class="preset-item" @click="addTextElement('caption')">
                  <div class="preset-preview caption-style">图片说明</div>
                  <span>图片说明</span>
                </div>
              </div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="decorations" title="装饰">
            <div class="sidebar-content">
              <div class="decoration-grid">
                <div
                  v-for="d in decorationElements"
                  :key="d.id"
                  class="decoration-item"
                  @click="addDecorationElement(d)"
                >
                  <span class="decoration-emoji">{{ d.emoji }}</span>
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>

      <div class="editor-canvas-area">
        <div class="canvas-toolbar">
          <a-space size="small">
            <a-button size="small" @click="zoomOut">−</a-button>
            <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
            <a-button size="small" @click="zoomIn">+</a-button>
            <a-button size="small" @click="zoomFit">适应</a-button>
          </a-space>
          <a-divider type="vertical" />
          <span class="page-info">第 {{ currentPageIndex + 1 }} / {{ pages.length }} 页</span>
          <a-spacer />
          <a-space size="small">
            <a-button size="small" :icon="iconLeft" :disabled="currentPageIndex === 0" @click="prevPage">
              上一页
            </a-button>
            <a-button size="small" type="primary" @click="addPage">+ 新增页面</a-button>
            <a-button size="small" :icon="iconRight" :disabled="currentPageIndex >= pages.length - 1" @click="nextPage">
              下一页
            </a-button>
          </a-space>
        </div>

        <div class="canvas-wrapper" ref="canvasWrapperRef">
          <div
            class="page-canvas"
            :style="canvasStyle"
            @dragover.prevent
            @drop="onDrop"
            @click="deselectElement"
          >
            <div
              v-for="(el, idx) in currentPageElements"
              :key="el.id || el.tempId || idx"
              class="page-element"
              :class="{
                selected: selectedElementId === el.id || selectedElementId === el.tempId,
                'polaroid-style': el.element_type === 'polaroid_photo'
              }"
              :style="getElementStyle(el)"
              @mousedown.stop="startDrag($event, el)"
              @click.stop="selectElement(el)"
            >
              <template v-if="el.element_type === 'photo' || el.element_type === 'polaroid_photo'">
                <img
                  v-if="getMediaById(el.media_id)"
                  :src="'file:///' + getMediaById(el.media_id).file_path.replace(/\\/g, '/')"
                  class="element-photo"
                />
                <div v-else class="element-placeholder">
                  <icon-image :size="32" />
                  <span>点击添加照片</span>
                </div>
              </template>

              <template v-else-if="el.element_type === 'text'">
                <div
                  class="element-text"
                  :style="getTextStyle(el)"
                  @dblclick.stop="startEditText(el)"
                  v-if="!editingElementId || editingElementId !== (el.id || el.tempId)"
                >
                  {{ el.content || '双击编辑文字' }}
                </div>
                <textarea
                  v-else
                  class="element-text-input"
                  :style="getTextStyle(el)"
                  v-model="editingText"
                  @blur="finishEditText(el)"
                  @keydown.esc="finishEditText(el)"
                  ref="textInputRef"
                />
              </template>

              <template v-else-if="el.element_type === 'decoration'">
                <div class="element-decoration" :style="getDecorationStyle(el)">
                  {{ getDecorationEmoji(el.content) }}
                </div>
              </template>

              <div
                v-if="selectedElementId === el.id || selectedElementId === el.tempId"
                class="resize-handle handle-se"
                @mousedown.stop="startResize($event, el, 'se')"
              ></div>
              <div
                v-if="selectedElementId === el.id || selectedElementId === el.tempId"
                class="element-delete"
                @click.stop="deleteElement(el)"
              >
                <icon-close :size="14" />
              </div>
            </div>
          </div>
        </div>

        <div class="pages-thumbnail">
          <div class="thumbnails-track">
            <div
              v-for="(page, idx) in pages"
              :key="page.id || page.tempId"
              class="page-thumb"
              :class="{ active: idx === currentPageIndex }"
              @click="goToPage(idx)"
            >
              <div class="thumb-canvas" :style="getThumbStyle(page)">
                <div
                  v-for="(el, eIdx) in page.elements || []"
                  :key="el.id || eIdx"
                  class="thumb-element"
                  :style="getThumbElementStyle(el)"
                >
                  <template v-if="el.element_type === 'photo' || el.element_type === 'polaroid_photo'">
                    <img v-if="getMediaById(el.media_id)" :src="'file:///' + getMediaById(el.media_id).file_path.replace(/\\/g, '/')" />
                  </template>
                  <template v-else-if="el.element_type === 'text'">
                    <span class="thumb-text">{{ el.content ? el.content.substring(0, 10) : '' }}</span>
                  </template>
                </div>
              </div>
              <span class="page-number">{{ idx + 1 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-sidebar right-sidebar">
        <div class="sidebar-title">属性</div>
        <div class="sidebar-content">
          <template v-if="selectedElement">
            <a-form layout="vertical" size="small">
              <a-form-item label="类型">
                <span>{{ elementTypeLabel }}</span>
              </a-form-item>
              <a-form-item label="位置 X (mm)">
                <a-input-number v-model="selectedElement.x" :step="1" @change="onElementChange" style="width: 100%" />
              </a-form-item>
              <a-form-item label="位置 Y (mm)">
                <a-input-number v-model="selectedElement.y" :step="1" @change="onElementChange" style="width: 100%" />
              </a-form-item>
              <a-form-item label="宽度 (mm)">
                <a-input-number v-model="selectedElement.width" :step="1" :min="10" @change="onElementChange" style="width: 100%" />
              </a-form-item>
              <a-form-item label="高度 (mm)">
                <a-input-number v-model="selectedElement.height" :step="1" :min="10" @change="onElementChange" style="width: 100%" />
              </a-form-item>
              <a-form-item label="旋转角度">
                <a-input-number v-model="selectedElement.rotation" :step="1" @change="onElementChange" style="width: 100%" />
              </a-form-item>
              <a-form-item label="层级">
                <a-space>
                  <a-button size="mini" @click="moveLayer('up')">上移</a-button>
                  <a-button size="mini" @click="moveLayer('down')">下移</a-button>
                </a-space>
              </a-form-item>

              <template v-if="selectedElement.element_type === 'text'">
                <a-divider>文字样式</a-divider>
                <a-form-item label="字体大小">
                  <a-input-number v-model="textStyle.fontSize" :step="1" :min="8" @change="onStyleChange" style="width: 100%" />
                </a-form-item>
                <a-form-item label="字体颜色">
                  <input type="color" v-model="textStyle.color" @input="onStyleChange" class="color-picker" />
                </a-form-item>
                <a-form-item label="字重">
                  <a-select v-model="textStyle.fontWeight" @change="onStyleChange" style="width: 100%">
                    <a-option value="normal">常规</a-option>
                    <a-option value="bold">粗体</a-option>
                    <a-option value="300">细体</a-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="对齐">
                  <a-radio-group v-model="textStyle.textAlign" type="button" size="mini" @change="onStyleChange">
                    <a-radio value="left">左</a-radio>
                    <a-radio value="center">中</a-radio>
                    <a-radio value="right">右</a-radio>
                  </a-radio-group>
                </a-form-item>
              </template>

              <a-divider />
              <a-button type="outline" status="danger" size="small" @click="deleteElement(selectedElement)" style="width: 100%">
                删除元素
              </a-button>
            </a-form>
          </template>
          <template v-else>
            <div class="empty-properties">
              <icon-select-all :size="24" />
              <p>选择一个元素<br />查看并编辑属性</p>
            </div>
          </template>
        </div>
      </div>
    </div>

    <MediaSelector v-model="mediaSelectorVisible" @confirm="onMediaSelected" />
    <PhotoBook3DPreview v-model="showPreview" :book-data="bookDataForPreview" :template="currentTemplate" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, nextTick } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconBackward, IconToLeft, IconToRight, IconEye, IconDownload,
  IconPlus, IconImage, IconClose, IconLeft, IconRight, IconApps
} from '@arco-design/web-vue/es/icon'
import MediaSelector from '@/components/MediaSelector.vue'
import PhotoBook3DPreview from './PhotoBook3DPreview.vue'
import { PHOTO_BOOK_TEMPLATES, DECORATION_ELEMENTS, getTemplateById, mmToPx } from '@/utils/photoBookTemplates'
import { generatePhotoBookPDF } from '@/utils/pdfGenerator'

const props = defineProps({
  bookId: { type: Number, default: null },
  albumId: { type: Number, default: null },
  templateType: { type: String, default: 'a4_hardcover' },
  initialPhotos: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'saved'])

const api = window.electronAPI

const iconBack = IconBackward
const iconUndo = IconToLeft
const iconRedo = IconToRight
const iconEye = IconEye
const iconDownload = IconDownload
const iconPlus = IconPlus
const iconImage = IconImage
const iconClose = IconClose
const iconLeft = IconLeft
const iconRight = IconRight
const iconSelectAll = IconApps

const loading = ref(false)
const bookId = ref(props.bookId)
const bookTitle = ref('未命名照片书')
const activeTab = ref('photos')
const zoom = ref(0.6)
const currentPageIndex = ref(0)
const pages = ref([])
const selectedElementId = ref(null)
const editingElementId = ref(null)
const editingText = ref('')
const textInputRef = ref(null)
const mediaSelectorVisible = ref(false)
const showPreview = ref(false)
const availablePhotos = ref([])
const canvasWrapperRef = ref(null)
const decorationElements = DECORATION_ELEMENTS

const currentTemplate = computed(() => getTemplateById(props.templateType))

const currentPage = computed(() => pages.value[currentPageIndex.value] || null)

const currentPageElements = computed(() => {
  if (!currentPage.value) return []
  return currentPage.value.elements || []
})

const selectedElement = computed(() => {
  if (!selectedElementId.value) return null
  return currentPageElements.value.find(el => el.id === selectedElementId.value || el.tempId === selectedElementId.value)
})

const elementTypeLabel = computed(() => {
  if (!selectedElement.value) return ''
  const map = { photo: '照片', polaroid_photo: '拍立得照片', text: '文字', decoration: '装饰' }
  return map[selectedElement.value.element_type] || '元素'
})

const textStyle = computed({
  get() {
    if (!selectedElement.value?.style) return { fontSize: 14, color: '#333333', fontWeight: 'normal', textAlign: 'left' }
    return { ...selectedElement.value.style }
  },
  set(val) {
    if (selectedElement.value) {
      selectedElement.value.style = { ...val }
    }
  }
})

const canvasStyle = computed(() => {
  const t = currentTemplate.value
  const pxW = mmToPx(t.width, 96) * zoom.value
  const pxH = mmToPx(t.height, 96) * zoom.value
  return {
    width: `${pxW}px`,
    height: `${pxH}px`,
    backgroundColor: currentPage.value?.background_color || '#ffffff',
    backgroundImage: currentPage.value?.background_image ? `url(file:///${currentPage.value.background_image})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
})

const bookDataForPreview = computed(() => ({
  title: bookTitle.value,
  pages: pages.value,
  template: props.templateType
}))

let dragState = null
let resizeState = null

const getMediaById = (id) => {
  return availablePhotos.value.find(m => m.id === id)
}

const getDecorationEmoji = (content) => {
  const d = decorationElements.find(x => x.id === content || x.emoji === content)
  return d?.emoji || content || '✨'
}

const getElementStyle = (el) => {
  const scale = zoom.value
  return {
    left: `${el.x * scale * (96 / 25.4)}px`,
    top: `${el.y * scale * (96 / 25.4)}px`,
    width: `${el.width * scale * (96 / 25.4)}px`,
    height: `${el.height * scale * (96 / 25.4)}px`,
    transform: `rotate(${el.rotation || 0}deg)`,
    zIndex: el.z_index || 0
  }
}

const getTextStyle = (el) => {
  const s = el.style || {}
  return {
    fontSize: s.fontSize ? `${s.fontSize}px` : '14px',
    fontWeight: s.fontWeight || 'normal',
    color: s.color || '#333333',
    textAlign: s.textAlign || 'left',
    fontStyle: s.fontStyle || 'normal',
    lineHeight: s.lineHeight || 1.4,
    letterSpacing: s.letterSpacing || 'normal'
  }
}

const getDecorationStyle = (el) => {
  const s = el.style || {}
  return {
    fontSize: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  }
}

const getThumbStyle = (page) => {
  const t = currentTemplate.value
  const ratio = t.height / t.width
  return {
    aspectRatio: `${t.width} / ${t.height}`,
    backgroundColor: page.background_color || '#ffffff'
  }
}

const getThumbElementStyle = (el) => {
  return {
    left: `${(el.x / currentTemplate.value.width) * 100}%`,
    top: `${(el.y / currentTemplate.value.height) * 100}%`,
    width: `${(el.width / currentTemplate.value.width) * 100}%`,
    height: `${(el.height / currentTemplate.value.height) * 100}%`,
    transform: `rotate(${el.rotation || 0}deg)`,
    zIndex: el.z_index || 0
  }
}

const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.1, 2)
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.1, 0.2)
}

const zoomFit = () => {
  if (!canvasWrapperRef.value) return
  const wrapperRect = canvasWrapperRef.value.getBoundingClientRect()
  const t = currentTemplate.value
  const pageW = mmToPx(t.width, 96)
  const pageH = mmToPx(t.height, 96)
  const scaleX = (wrapperRect.width - 80) / pageW
  const scaleY = (wrapperRect.height - 120) / pageH
  zoom.value = Math.min(scaleX, scaleY, 1)
}

const nextPage = () => {
  if (currentPageIndex.value < pages.value.length - 1) {
    currentPageIndex.value++
    selectedElementId.value = null
  }
}

const prevPage = () => {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--
    selectedElementId.value = null
  }
}

const goToPage = (idx) => {
  currentPageIndex.value = idx
  selectedElementId.value = null
}

const addPage = () => {
  const newPage = {
    tempId: 'page_' + Date.now(),
    page_number: pages.value.length + 1,
    template_id: null,
    background_color: '#ffffff',
    elements: [],
    sort_order: pages.value.length
  }
  pages.value.push(newPage)
  currentPageIndex.value = pages.value.length - 1
  saveBook()
}

const selectElement = (el) => {
  selectedElementId.value = el.id || el.tempId
}

const deselectElement = () => {
  selectedElementId.value = null
  finishEditing()
}

const startDrag = (e, el) => {
  selectElement(el)
  const startX = e.clientX
  const startY = e.clientY
  const origX = el.x
  const origY = el.y
  const scale = zoom.value * (96 / 25.4)

  const onMouseMove = (e) => {
    const dx = (e.clientX - startX) / scale
    const dy = (e.clientY - startY) / scale
    el.x = Math.round(origX + dx)
    el.y = Math.round(origY + dy)
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    saveBook()
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const startResize = (e, el, handle) => {
  const startX = e.clientX
  const startY = e.clientY
  const origW = el.width
  const origH = el.height
  const scale = zoom.value * (96 / 25.4)

  const onMouseMove = (e) => {
    const dx = (e.clientX - startX) / scale
    const dy = (e.clientY - startY) / scale
    if (handle === 'se') {
      el.width = Math.max(20, Math.round(origW + dx))
      el.height = Math.max(20, Math.round(origH + dy))
    }
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    saveBook()
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const deleteElement = (el) => {
  const page = currentPage.value
  if (!page) return
  page.elements = page.elements.filter(e => e.id !== el.id && e.tempId !== el.tempId)
  selectedElementId.value = null
  saveBook()
}

const moveLayer = (direction) => {
  const el = selectedElement.value
  if (!el) return
  const elements = currentPageElements.value
  const idx = elements.findIndex(e => e.id === el.id || e.tempId === el.tempId)
  if (idx === -1) return

  if (direction === 'up' && idx < elements.length - 1) {
    const next = elements[idx + 1]
    const tmpZ = el.z_index
    el.z_index = next.z_index
    next.z_index = tmpZ
    elements.splice(idx, 2, next, el)
  } else if (direction === 'down' && idx > 0) {
    const prev = elements[idx - 1]
    const tmpZ = el.z_index
    el.z_index = prev.z_index
    prev.z_index = tmpZ
    elements.splice(idx - 1, 2, el, prev)
  }
  saveBook()
}

const onElementChange = () => {
  saveBook()
}

const onStyleChange = () => {
  if (selectedElement.value) {
    selectedElement.value.style = { ...textStyle.value }
    saveBook()
  }
}

const startEditText = (el) => {
  editingElementId.value = el.id || el.tempId
  editingText.value = el.content || ''
  nextTick(() => {
    if (textInputRef.value) {
      const input = Array.isArray(textInputRef.value) ? textInputRef.value[0] : textInputRef.value
      input?.focus()
      input?.select()
    }
  })
}

const finishEditText = (el) => {
  if (editingElementId.value) {
    el.content = editingText.value
    editingElementId.value = null
    editingText.value = ''
    saveBook()
  }
}

const finishEditing = () => {
  if (editingElementId.value && selectedElement.value) {
    selectedElement.value.content = editingText.value
  }
  editingElementId.value = null
  editingText.value = ''
}

const onPhotoDragStart = (e, media) => {
  e.dataTransfer.setData('mediaId', media.id.toString())
  e.dataTransfer.effectAllowed = 'copy'
}

const onDrop = (e) => {
  const mediaId = parseInt(e.dataTransfer.getData('mediaId'))
  if (!mediaId) return

  const canvas = e.currentTarget.getBoundingClientRect()
  const scale = zoom.value * (96 / 25.4)
  const x = (e.clientX - canvas.left) / scale - 30
  const y = (e.clientY - canvas.top) / scale - 40

  addPhotoElement(mediaId, Math.max(0, x), Math.max(0, y))
}

const addPhotoToPage = (media) => {
  const t = currentTemplate.value
  addPhotoElement(media.id, t.width * 0.15, t.height * 0.15)
}

const addPhotoElement = (mediaId, x, y) => {
  const page = currentPage.value
  if (!page) return

  const media = getMediaById(mediaId)
  if (!media) return

  const t = currentTemplate.value
  const w = t.width * 0.5
  const h = t.height * 0.4
  const maxZ = Math.max(...page.elements.map(e => e.z_index || 0), 0)

  const el = {
    tempId: 'el_' + Date.now(),
    element_type: 'photo',
    media_id: mediaId,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(w),
    height: Math.round(h),
    rotation: 0,
    z_index: maxZ + 1,
    style: null
  }

  page.elements.push(el)
  selectedElementId.value = el.tempId
  saveBook()
}

const addTextElement = (preset) => {
  const page = currentPage.value
  if (!page) return

  const t = currentTemplate.value
  const maxZ = Math.max(...page.elements.map(e => e.z_index || 0), 0)

  const presets = {
    title: { content: '双击编辑标题', style: { fontSize: 32, fontWeight: 'bold', color: '#333333', textAlign: 'center' }, w: 150, h: 40 },
    subtitle: { content: '双击编辑副标题', style: { fontSize: 18, fontWeight: 'normal', color: '#666666', textAlign: 'center' }, w: 130, h: 30 },
    body: { content: '双击编辑正文内容，记录这段旅行的美好回忆...', style: { fontSize: 12, fontWeight: 'normal', color: '#444444', textAlign: 'left' }, w: 120, h: 60 },
    caption: { content: '图片说明文字', style: { fontSize: 10, fontStyle: 'italic', color: '#888888', textAlign: 'left' }, w: 100, h: 20 }
  }

  const cfg = presets[preset] || presets.body

  const el = {
    tempId: 'el_' + Date.now(),
    element_type: 'text',
    content: cfg.content,
    x: Math.round(t.width * 0.2),
    y: Math.round(t.height * 0.1),
    width: cfg.w,
    height: cfg.h,
    rotation: 0,
    z_index: maxZ + 1,
    style: { ...cfg.style }
  }

  page.elements.push(el)
  selectedElementId.value = el.tempId
  saveBook()
}

const addDecorationElement = (decoration) => {
  const page = currentPage.value
  if (!page) return

  const t = currentTemplate.value
  const maxZ = Math.max(...page.elements.map(e => e.z_index || 0), 0)

  const el = {
    tempId: 'el_' + Date.now(),
    element_type: 'decoration',
    content: decoration.id,
    x: Math.round(t.width * 0.3),
    y: Math.round(t.height * 0.2),
    width: 30,
    height: 30,
    rotation: 0,
    z_index: maxZ + 1,
    style: null
  }

  page.elements.push(el)
  selectedElementId.value = el.tempId
  saveBook()
}

const openMediaSelector = () => {
  mediaSelectorVisible.value = true
}

const onMediaSelected = (items) => {
  availablePhotos.value = items.filter(m => m.file_type === 'image')
}

const saveBookTitle = () => {
  saveBook()
}

const initBook = async () => {
  loading.value = true
  try {
    if (props.bookId) {
      const data = await api.photobook.full(props.bookId)
      if (data) {
        bookId.value = data.id
        bookTitle.value = data.title
        pages.value = data.pages || []
        if (data.album_id) {
          const media = await api.media.getByAlbum(data.album_id)
          availablePhotos.value = media.filter(m => m.file_type === 'image')
        }
      }
    } else {
      availablePhotos.value = props.initialPhotos.filter(m => m.file_type === 'image')
      initPagesFromTemplate()
    }

    if (!pages.value.length) {
      initPagesFromTemplate()
    }
  } finally {
    loading.value = false
    nextTick(() => zoomFit())
  }
}

const initPagesFromTemplate = () => {
  const t = currentTemplate.value
  pages.value = t.pages.map((p, idx) => {
    const layout = t.pageLayouts[p.template_id]
    const elements = layout?.elements?.map((e, eIdx) => ({
      tempId: `el_${idx}_${eIdx}_${Date.now()}`,
      element_type: e.type,
      media_id: null,
      content: e.content || null,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      rotation: e.rotation || 0,
      z_index: e.z_index || eIdx,
      style: e.style || null
    })) || []

    return {
      tempId: 'page_' + Date.now() + '_' + idx,
      page_number: idx + 1,
      template_id: p.template_id,
      background_color: '#ffffff',
      background_image: null,
      elements,
      sort_order: idx
    }
  })
}

const saveBook = async () => {
  try {
    const bookData = {
      album_id: props.albumId || null,
      title: bookTitle.value,
      template_type: props.templateType,
      config: null
    }

    if (bookId.value) {
      await api.photobook.update(bookId.value, bookData)
    } else {
      const id = await api.photobook.create(bookData)
      bookId.value = id
    }

    for (let i = 0; i < pages.value.length; i++) {
      const page = pages.value[i]
      const pageData = {
        photo_book_id: bookId.value,
        page_number: i + 1,
        template_id: page.template_id || null,
        background_color: page.background_color || '#ffffff',
        background_image: page.background_image || null,
        sort_order: i,
        config: page.config || null
      }

      let pageId
      if (page.id) {
        await api.photobook.pageUpdate(page.id, pageData)
        pageId = page.id
      } else {
        pageId = await api.photobook.pageCreate(pageData)
        page.id = pageId
      }

      for (const el of page.elements || []) {
        const elData = {
          page_id: pageId,
          element_type: el.element_type,
          media_id: el.media_id || null,
          content: el.content || null,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation || 0,
          z_index: el.z_index || 0,
          style: el.style || null,
          config: el.config || null
        }

        if (el.id) {
          await api.photobook.elementUpdate(el.id, elData)
        } else {
          const elId = await api.photobook.elementCreate(elData)
          el.id = elId
        }
      }
    }

    emit('saved')
  } catch (e) {
    console.error('保存失败:', e)
  }
}

const exportPDF = async () => {
  if (!pages.value.length) {
    Message.warning('没有页面可以导出')
    return
  }

  try {
    const result = await api.saveDialog({
      title: '导出 PDF',
      defaultPath: `${bookTitle.value || 'photo_book'}.pdf`,
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) return

    const pdfData = await generatePhotoBookPDF({
      title: bookTitle.value,
      pages: pages.value,
      template: currentTemplate.value,
      getMediaPath: (id) => {
        const m = availablePhotos.value.find(x => x.id === id)
        return m ? m.file_path : null
      }
    })

    await api.writeFile(result.filePath, pdfData)
    Message.success('PDF 导出成功！')

    const confirm = await new Promise(resolve => {
      Modal.confirm({
        title: '导出成功',
        content: 'PDF 已导出，是否打开文件所在文件夹？',
        okText: '打开',
        cancelText: '关闭',
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })

    if (confirm) {
      await api.showItemInFolder(result.filePath)
    }
  } catch (e) {
    console.error('导出失败:', e)
    Message.error('导出失败：' + e.message)
  }
}

onMounted(() => {
  initBook()
})
</script>

<style lang="less" scoped>
.photo-book-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f0e6;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e8e0d4;
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .book-title {
    font-size: 16px;
    font-weight: 600;

    :deep(.arco-input) {
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-sidebar {
  width: 260px;
  background: #fff;
  border: 1px solid #e8e0d4;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  &.left-sidebar {
    border-right: 1px solid #e8e0d4;
    border-left: none;
    border-top: none;
    border-bottom: none;
  }

  &.right-sidebar {
    border-left: 1px solid #e8e0d4;
    border-right: none;
    border-top: none;
    border-bottom: none;
  }

  .sidebar-title {
    padding: 12px 16px;
    font-weight: 600;
    border-bottom: 1px solid #eee;
    font-size: 13px;
    color: #4a4a4a;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }
}

.editor-canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e0d4;
  flex-shrink: 0;

  .zoom-level {
    font-size: 12px;
    color: #666;
    min-width: 50px;
    text-align: center;
  }

  .page-info {
    font-size: 12px;
    color: #888;
  }
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
  background:
    linear-gradient(45deg, #e8e0d4 25%, transparent 25%),
    linear-gradient(-45deg, #e8e0d4 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e8e0d4 75%),
    linear-gradient(-45deg, transparent 75%, #e8e0d4 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  background-color: #f5f0e6;
}

.page-canvas {
  position: relative;
  background: #fff;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s ease;
  overflow: hidden;
}

.page-element {
  position: absolute;
  cursor: move;
  box-sizing: border-box;
  border: 2px solid transparent;

  &:hover {
    border-color: rgba(126, 184, 218, 0.5);
  }

  &.selected {
    border-color: #7eb8da;
    box-shadow: 0 0 0 1px #7eb8da;
  }

  &.polaroid-style {
    background: #fff;
    padding: 8px 8px 24px 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

    .element-photo {
      width: 100%;
      height: calc(100% - 16px);
    }
  }

  .element-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  .element-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f5f0e6;
    color: #b0a08a;
    font-size: 12px;
    gap: 6px;
  }

  .element-text {
    width: 100%;
    height: 100%;
    overflow: hidden;
    word-wrap: break-word;
    white-space: pre-wrap;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .element-text-input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    background: rgba(255, 255, 255, 0.9);
    padding: 2px;
    font-family: inherit;
  }

  .element-decoration {
    font-size: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .resize-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #7eb8da;
    border: 2px solid #fff;
    border-radius: 2px;

    &.handle-se {
      right: -6px;
      bottom: -6px;
      cursor: se-resize;
    }
  }

  .element-delete {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 20px;
    height: 20px;
    background: #f55555;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s;

    &:hover {
      background: #e74c3c;
    }
  }

  &.selected .element-delete {
    opacity: 1;
  }
}

.pages-thumbnail {
  height: 120px;
  background: #fff;
  border-top: 1px solid #e8e0d4;
  padding: 12px 16px;
  flex-shrink: 0;
  overflow-x: auto;

  .thumbnails-track {
    display: flex;
    gap: 12px;
    height: 100%;
  }

  .page-thumb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;

    .thumb-canvas {
      width: 70px;
      height: 80px;
      background: #fff;
      border: 2px solid #e8e0d4;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      transition: all 0.2s;

      .thumb-element {
        position: absolute;
        overflow: hidden;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumb-text {
          font-size: 6px;
          color: #333;
        }
      }
    }

    &.active .thumb-canvas {
      border-color: #7eb8da;
      box-shadow: 0 2px 8px rgba(126, 184, 218, 0.3);
    }

    .page-number {
      font-size: 11px;
      color: #888;
    }
  }
}

.add-photos-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #f5f9fc, #faf6f0);
  border: 2px dashed #a8d8ea;
  border-radius: 10px;
  cursor: pointer;
  color: #7eb8da;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #7eb8da;
    background: #f5f9fc;
  }
}

.photo-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.photo-thumb {
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
  transition: all 0.2s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover {
    border-color: #7eb8da;
    transform: scale(1.05);
  }

  &:active {
    cursor: grabbing;
  }
}

.text-presets {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-item {
  cursor: pointer;
  text-align: center;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;

  &:hover {
    color: #7eb8da;
  }
}

.preset-preview {
  padding: 8px;
  background: #faf6f0;
  border: 1px solid #e8e0d4;
  border-radius: 6px;
  margin-bottom: 4px;

  &.title-style {
    font-size: 16px;
    font-weight: bold;
    color: #333;
  }

  &.subtitle-style {
    font-size: 12px;
    color: #666;
  }

  &.body-style {
    font-size: 11px;
    color: #444;
    text-align: left;
  }

  &.caption-style {
    font-size: 10px;
    font-style: italic;
    color: #888;
    text-align: left;
  }
}

.decoration-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.decoration-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #faf6f0;
  border: 1px solid #e8e0d4;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #7eb8da;
    background: #f5f9fc;
    transform: scale(1.1);
  }

  .decoration-emoji {
    font-size: 22px;
  }
}

.empty-properties {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #b0a08a;
  text-align: center;

  p {
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 1.6;
  }
}

.color-picker {
  width: 100%;
  height: 32px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  cursor: pointer;
}
</style>
