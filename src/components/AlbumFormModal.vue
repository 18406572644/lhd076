<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? '编辑相册' : '创建相册'"
    width="520px"
    :ok-text="isEdit ? '保存' : '创建'"
    @ok="handleSubmit"
    @cancel="visible = false"
    unmount-on-close
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item field="title" label="相册名称">
        <a-input v-model="form.title" placeholder="如：大理洱海日出" allow-clear />
      </a-form-item>
      <a-form-item label="关联旅行">
        <a-select v-model="form.travel_id" placeholder="选择旅行（可选）" allow-clear>
          <a-option v-for="t in travels" :key="t.id" :value="t.id">{{ t.title }}</a-option>
        </a-select>
      </a-form-item>
      <a-form-item label="相册封面">
        <div class="cover-upload">
          <div class="cover-preview" v-if="form.cover_image" @click="selectCover">
            <img :src="'file:///' + form.cover_image.replace(/\\/g, '/')" />
          </div>
          <div v-else class="cover-placeholder" @click="selectCover">
            <icon-plus :size="20" />
            <span>选择封面</span>
          </div>
        </div>
      </a-form-item>
      <a-form-item label="描述">
        <a-textarea
          v-model="form.description"
          placeholder="记录这个相册的故事..."
          :auto-size="{ minRows: 3, maxRows: 5 }"
          allow-clear
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'

const props = defineProps({
  modelValue: Boolean,
  album: Object,
  defaultTravelId: [Number, String]
})

const emit = defineEmits(['update:modelValue', 'success'])

const api = window.electronAPI
const iconPlus = IconPlus

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.album?.id)
const formRef = ref()
const travels = ref([])

const form = reactive({
  title: '',
  travel_id: undefined,
  cover_image: '',
  description: ''
})

const rules = {
  title: [{ required: true, message: '请输入相册名称' }]
}

onMounted(async () => {
  travels.value = await api.travel.list()
})

watch(() => props.album, (val) => {
  if (val) {
    Object.assign(form, {
      title: val.title || '',
      travel_id: val.travel_id || undefined,
      cover_image: val.cover_image || '',
      description: val.description || ''
    })
  } else {
    reset()
  }
}, { immediate: true })

watch(() => props.defaultTravelId, (v) => {
  if (v && !form.travel_id) form.travel_id = v
})

watch(visible, (v) => {
  if (!v) reset()
})

const reset = () => {
  Object.assign(form, {
    title: '',
    travel_id: props.defaultTravelId || undefined,
    cover_image: '',
    description: ''
  })
}

const selectCover = async () => {
  const r = await api.selectFiles()
  if (r.canceled || !r.filePaths?.length) return
  form.cover_image = r.filePaths[0]
}

const handleSubmit = async () => {
  try { await formRef.value.validate() } catch { return }
  try {
    if (isEdit.value) {
      await api.album.update(props.album.id, { ...form })
      Message.success('相册已更新')
    } else {
      await api.album.create({ ...form })
      Message.success('相册创建成功')
    }
    emit('success')
    visible.value = false
  } catch (e) {
    Message.error('操作失败')
  }
}
</script>

<style lang="less" scoped>
.cover-upload {
  display: flex;
}

.cover-preview,
.cover-placeholder {
  width: 160px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px dashed #e8e0d4;
  cursor: pointer;
  background: #faf6f0;
}

.cover-preview {
  border-color: transparent;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #b0a08a;
  font-size: 12px;

  &:hover {
    border-color: #7eb8da;
    color: #7eb8da;
  }
}
</style>
