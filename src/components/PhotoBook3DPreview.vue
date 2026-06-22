<template>
  <a-modal
    v-model:visible="visible"
    :title="bookData?.title || '3D 翻页预览'"
    width="900px"
    :footer="null"
    :mask-closable="true"
    @ok="visible = false"
    @cancel="visible = false"
  >
    <div class="preview-3d-container">
      <div class="book-stage" @mousedown="startDrag" @mousemove="onDrag" @mouseup="endDrag" @mouseleave="endDrag">
        <div class="book-wrapper" :style="bookWrapperStyle">
          <div class="book" :style="bookStyle">
            <div
              v-for="(page, idx) in displayPages"
              :key="page.id || idx"
              class="book-page"
              :class="{
                'page-front': idx === currentPage - 1,
                'page-back': idx === currentPage,
                'page-flipping': isFlipping
              }"
              :style="getPageStyle(idx)"
            >
              <div class="page-inner" v-if="page">
                <div class="page-content" :style="getContentStyle(page)">
                  <template v-for="(el, eIdx) in page.elements || []" :key="el.id || eIdx">
                    <div class="element" :style="getElementStyle(el)">
                      <template v-if="el.element_type === 'photo' || el.element_type === 'polaroid_photo'">
                        <img
                          v-if="getMediaPath(el.media_id)"
                          :src="'file:///' + getMediaPath(el.media_id).replace(/\\/g, '/')"
                          class="el-photo"
                          :class="{ 'polaroid-photo': el.element_type === 'polaroid_photo' }"
                        />
                      </template>
                      <template v-else-if="el.element_type === 'text'">
                        <div class="el-text" :style="getTextStyle(el)">
                          {{ el.content || '' }}
                        </div>
                      </template>
                      <template v-else-if="el.element_type === 'decoration'">
                        <div class="el-decoration">
                          {{ getDecorationEmoji(el.content) }}
                        </div>
                      </template>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="preview-controls">
        <a-space>
          <a-button :disabled="currentPage <= 0" @click="prevPage">
            <template #icon><icon-left /></template>
            上一页
          </a-button>
          <span class="page-indicator">第 {{ currentPage + 1 }} / {{ totalPages }} 页</span>
          <a-button :disabled="currentPage >= totalPages - 1" @click="nextPage">
            下一页
            <template #icon><icon-right /></template>
          </a-button>
        </a-space>
        <a-divider type="vertical" />
        <a-space>
          <a-button size="small" @click="zoomOut">−</a-button>
          <span class="zoom-text">{{ Math.round(zoom * 100) }}%</span>
          <a-button size="small" @click="zoomIn">+</a-button>
        </a-space>
        <a-divider type="vertical" />
        <a-space>
          <span class="rotate-label">视角</span>
          <a-slider
            v-model="rotateY"
            :min="-60"
            :max="60"
            style="width: 120px"
          />
        </a-space>
      </div>

      <div class="preview-tips">
        <icon-info :size="14" />
        <span>提示：拖拽书本可旋转视角，点击左右按钮翻页</span>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { IconLeft, IconRight, IconInfo } from '@arco-design/web-vue/es/icon'
import { DECORATION_ELEMENTS } from '@/utils/photoBookTemplates'

const props = defineProps({
  modelValue: Boolean,
  bookData: Object,
  template: Object
})

const emit = defineEmits(['update:modelValue'])

const iconLeft = IconLeft
const iconRight = IconRight
const iconInfo = IconInfo

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const currentPage = ref(0)
const zoom = ref(0.8)
const rotateY = ref(15)
const rotateX = ref(5)
const isFlipping = ref(false)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartRotateY = ref(0)
const dragStartRotateX = ref(0)

const mediaCache = ref({})

const totalPages = computed(() => {
  return props.bookData?.pages?.length || 0
})

const displayPages = computed(() => {
  const pages = props.bookData?.pages || []
  const result = []
  for (let i = 0; i < Math.min(pages.length, currentPage.value + 2); i++) {
    result.push(pages[i])
  }
  while (result.length < 2) {
    result.push(null)
  }
  return result
})

const bookWrapperStyle = computed(() => ({
  transform: `scale(${zoom.value})`
}))

const bookStyle = computed(() => ({
  transform: `rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg)`,
  width: getBookWidth() + 'px',
  height: getBookHeight() + 'px'
}))

const getBookWidth = () => {
  const t = props.template
  if (!t) return 300
  const scale = 1.5
  return (t.width / 25.4) * 96 * scale
}

const getBookHeight = () => {
  const t = props.template
  if (!t) return 420
  const scale = 1.5
  return (t.height / 25.4) * 96 * scale
}

const getPageStyle = (idx) => {
  const isFront = idx === currentPage.value - 1
  const isBack = idx === currentPage.value
  const isFlippingPage = isFlipping.value && (isFront || isBack)

  let rotateYVal = 0
  if (idx < currentPage.value - 1) {
    rotateYVal = -180
  } else if (idx > currentPage.value) {
    rotateYVal = 0
  } else if (isFront) {
    rotateYVal = -180
  }

  return {
    transform: `rotateY(${rotateYVal}deg)`,
    zIndex: idx === currentPage.value ? 10 : idx,
    transformStyle: 'preserve-3d'
  }
}

const getContentStyle = (page) => {
  const t = props.template
  if (!t) return {}
  return {
    backgroundColor: page?.background_color || '#ffffff',
    width: '100%',
    height: '100%'
  }
}

const getElementStyle = (el) => {
  const t = props.template
  if (!t) return {}
  const w = getBookWidth()
  const h = getBookHeight()
  return {
    left: `${(el.x / t.width) * 100}%`,
    top: `${(el.y / t.height) * 100}%`,
    width: `${(el.width / t.width) * 100}%`,
    height: `${(el.height / t.height) * 100}%`,
    transform: `rotate(${el.rotation || 0}deg)`,
    zIndex: el.z_index || 0
  }
}

const getTextStyle = (el) => {
  const s = el.style || {}
  return {
    fontSize: s.fontSize ? `${s.fontSize * 1.5}px` : '14px',
    fontWeight: s.fontWeight || 'normal',
    color: s.color || '#333333',
    textAlign: s.textAlign || 'left',
    fontStyle: s.fontStyle || 'normal',
    lineHeight: s.lineHeight || 1.4
  }
}

const getMediaPath = (id) => {
  if (!id) return null
  const m = props.bookData?.mediaList?.find(x => x.id === id)
  return m?.file_path || null
}

const getDecorationEmoji = (content) => {
  const d = DECORATION_ELEMENTS.find(x => x.id === content || x.emoji === content)
  return d?.emoji || content || '✨'
}

const prevPage = () => {
  if (currentPage.value > 0) {
    isFlipping.value = true
    setTimeout(() => {
      currentPage.value--
      isFlipping.value = false
    }, 100)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    isFlipping.value = true
    setTimeout(() => {
      currentPage.value++
      isFlipping.value = false
    }, 100)
  }
}

const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.1, 2)
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.1, 0.3)
}

const startDrag = (e) => {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragStartRotateY.value = rotateY.value
  dragStartRotateX.value = rotateX.value
}

const onDrag = (e) => {
  if (!isDragging.value) return
  const dx = e.clientX - dragStartX.value
  const dy = e.clientY - dragStartY.value
  rotateY.value = Math.max(-80, Math.min(80, dragStartRotateY.value + dx * 0.5))
  rotateX.value = Math.max(-30, Math.min(30, dragStartRotateX.value - dy * 0.3))
}

const endDrag = () => {
  isDragging.value = false
}

watch(visible, (v) => {
  if (v) {
    currentPage.value = 0
    rotateY.value = 15
    rotateX.value = 5
    zoom.value = 0.8
  }
})
</script>

<style lang="less" scoped>
.preview-3d-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 10px 0;
}

.book-stage {
  width: 100%;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1500px;
  cursor: grab;
  background:
    radial-gradient(ellipse at center, #f8f5ef 0%, #e8e0d4 100%);
  border-radius: 12px;

  &:active {
    cursor: grabbing;
  }
}

.book-wrapper {
  transform-style: preserve-3d;
  transition: transform 0.1s ease-out;
}

.book {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.3s ease-out;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.book-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #fff;
  transform-origin: left center;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  border: 1px solid #ddd;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);

  &.page-flipping {
    transition: transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1);
  }

  .page-inner {
    width: 100%;
    height: 100%;
    overflow: hidden;
    backface-visibility: hidden;
  }
}

.page-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.element {
  position: absolute;
  overflow: hidden;
  box-sizing: border-box;

  .el-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &.polaroid-photo {
      padding: 6% 6% 18% 6%;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
    }
  }

  .el-text {
    width: 100%;
    height: 100%;
    word-wrap: break-word;
    white-space: pre-wrap;
    overflow: hidden;
  }

  .el-decoration {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 200%;
  }
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .page-indicator {
    font-size: 13px;
    color: #666;
    min-width: 80px;
    text-align: center;
  }

  .zoom-text {
    font-size: 12px;
    color: #666;
    min-width: 40px;
    text-align: center;
  }

  .rotate-label {
    font-size: 12px;
    color: #888;
  }
}

.preview-tips {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}
</style>
