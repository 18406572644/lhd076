<template>
  <div class="media-card" :class="{ selected: isSelected, [typeClass]: true }" @click="handleClick">
    <div class="media-thumb" v-if="media.file_type === 'image'">
      <img :src="imgSrc" @error="handleImgError" :style="{ opacity: loaded ? 1 : 0 }" @load="loaded = true" />
      <div class="thumb-loading" v-if="!loaded">
        <icon-image :size="28" />
      </div>
    </div>
    <div class="media-thumb video-thumb" v-else-if="media.file_type === 'video'">
      <div class="video-bg"></div>
      <div class="video-play">
        <icon-play-circle :size="28" />
      </div>
      <div v-if="media.duration" class="video-duration">
        {{ formatDuration(media.duration) }}
      </div>
    </div>
    <div class="media-thumb file-thumb" v-else>
      <icon-file :size="32" />
    </div>

    <div class="media-overlay">
      <div class="overlay-top">
        <a-checkbox v-if="selectable" :model-value="isSelected" @click.stop />
        <div class="fav-btn" v-if="media.is_favorite">
          <icon-star-fill :size="14" />
        </div>
        <div v-if="media.taken_at" class="date-tag">
          <icon-calendar :size="11" />
          {{ formatDate(media.taken_at, 'MM-DD') }}
        </div>
      </div>
      <div class="overlay-bottom">
        <div class="media-title" v-if="media.title || media.original_name">
          {{ media.title || media.original_name }}
        </div>
      </div>
    </div>

    <div class="select-marker" v-if="isSelected">
      <icon-check />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  IconImage,
  IconPlayCircle,
  IconFile,
  IconStarFill,
  IconCalendar,
  IconCheck
} from '@arco-design/web-vue/es/icon'
import { formatDate, formatDuration, parseTags } from '@/utils'

const props = defineProps({
  media: {
    type: Object,
    required: true
  },
  selectable: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'select'])

const loaded = ref(false)
const iconImage = IconImage
const iconPlayCircle = IconPlayCircle
const iconFile = IconFile
const iconStarFill = IconStarFill
const iconCalendar = IconCalendar
const iconCheck = IconCheck

const isSelected = computed(() => props.selected)

const typeClass = computed(() => `type-${props.media.file_type}`)

const imgSrc = computed(() => {
  if (!props.media.file_path) return ''
  return 'file:///' + props.media.file_path.replace(/\\/g, '/')
})

const handleImgError = () => {
  loaded.value = true
}

const handleClick = (e) => {
  if (props.selectable) {
    emit('select', !props.selected)
  }
  emit('click', props.media)
}
</script>

<style lang="less" scoped>
.media-card {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  border: 2px solid transparent;
  cursor: pointer;
  aspect-ratio: 1;
  transition: all 0.25s ease;
  box-shadow: 0 1px 6px rgba(0,0,0,0.05);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(126, 184, 218, 0.2);
    border-color: #a8d8ea;
  }

  &.selected {
    border-color: #7eb8da;
    box-shadow: 0 6px 18px rgba(126, 184, 218, 0.35);
  }

  &.type-video .video-thumb {
    background: linear-gradient(135deg, #c4a77d, #a88a5c);
  }
}

.media-thumb {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
  }
}

.thumb-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c4c4c4;
  background: #f5f5f5;
}

.video-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;

  .video-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(196, 167, 125, 0.9), rgba(168, 138, 92, 0.9));
  }

  .video-play {
    position: relative;
    z-index: 1;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 4px;
  }

  .video-duration {
    position: absolute;
    right: 8px;
    bottom: 8px;
    background: rgba(0,0,0,0.6);
    color: #fff;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    z-index: 1;
  }
}

.file-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5efe6;
  color: #c4a77d;
}

.media-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
  background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.45) 100%);
}

.media-card:hover .media-overlay {
  opacity: 1;
}

.overlay-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
  pointer-events: auto;
}

.fav-btn {
  color: #ffc107;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
}

.date-tag {
  background: rgba(255,255,255,0.9);
  color: #5a9fc4;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.overlay-bottom {
  pointer-events: auto;
}

.media-title {
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}

.select-marker {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  background: #7eb8da;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  animation: popIn 0.2s ease;
}

@keyframes popIn {
  from { transform: scale(0); }
  to { transform: scale(1); }
}
</style>
