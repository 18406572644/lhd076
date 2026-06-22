<template>
  <a-modal
    v-model:visible="visible"
    title="加入相册"
    width="480px"
    :ok-text="'确认'"
    @ok="handleConfirm"
    @cancel="visible = false"
    @before-ok="false"
  >
    <div v-if="loading" style="text-align: center; padding: 20px;">
      <a-spin tip="加载中..." />
    </div>
    <template v-else>
      <a-form layout="vertical">
        <a-form-item label="选择目标相册">
          <a-select v-model="selectedAlbum" placeholder="选择相册" style="width: 100%">
            <a-option v-for="a in albums" :key="a.id" :value="a.id">
              {{ a.title }} ({{ a.media_count || 0 }} 张)
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="或创建新相册">
          <a-input v-model="newAlbumName" placeholder="输入新相册名称..." allow-clear />
        </a-form-item>
        <a-form-item label="关联旅行（可选）">
          <a-select v-model="newAlbumTravel" placeholder="选择旅行" allow-clear style="width: 100%">
            <a-option v-for="t in travels" :key="t.id" :value="t.id">{{ t.title }}</a-option>
          </a-select>
        </a-form-item>
      </a-form>
      <a-alert
        v-if="mediaIds.length"
        type="info"
        :title="`将把 ${mediaIds.length} 个文件加入相册`"
        style="margin-bottom: 8px;"
      />
    </template>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'

const props = defineProps({
  modelValue: Boolean,
  mediaIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const api = window.electronAPI || {}

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const albums = ref([])
const travels = ref([])
const selectedAlbum = ref(undefined)
const newAlbumName = ref('')
const newAlbumTravel = ref(undefined)
const loading = ref(false)

watch(visible, async (v) => {
  if (v) {
    loading.value = true
    try {
      albums.value = await api.album.list()
      travels.value = await api.travel.list()
    } finally {
      loading.value = false
    }
    selectedAlbum.value = undefined
    newAlbumName.value = ''
  }
})

const handleConfirm = async () => {
  if (!selectedAlbum.value && !newAlbumName.value.trim()) {
    Message.warning('请选择相册或输入新相册名称')
    return false
  }
  try {
    let albumId = selectedAlbum.value
    if (!albumId && newAlbumName.value.trim()) {
      albumId = await api.album.create({
        title: newAlbumName.value.trim(),
        travel_id: newAlbumTravel.value || undefined
      })
    }
    let added = 0
    for (const id of props.mediaIds) {
      try {
        await api.media.addToAlbum(id, albumId)
        added++
      } catch (e) {}
    }
    Message.success(`成功加入 ${added} 个文件`)
    emit('success')
    visible.value = false
    return true
  } catch (e) {
    console.error(e)
    Message.error('操作失败')
    return false
  }
}
</script>
