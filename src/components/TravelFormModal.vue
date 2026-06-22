<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? '编辑旅行' : '创建新旅行'"
    width="560px"
    :ok-text="isEdit ? '保存' : '创建'"
    @ok="handleSubmit"
    @cancel="visible = false"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item field="title" label="旅行名称">
        <a-input v-model="form.title" placeholder="如：2024 夏·云南之旅" allow-clear />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="start_date" label="开始日期">
            <a-date-picker v-model="form.start_date" style="width: 100%" value-format="YYYY-MM-DD" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="end_date" label="结束日期">
            <a-date-picker v-model="form.end_date" style="width: 100%" value-format="YYYY-MM-DD" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="旅行地点">
        <a-space direction="vertical" style="width: 100%">
          <a-input v-model="form.location" placeholder="输入地点名称，如：云南省大理市" allow-clear />
          <a-space>
            <a-input-number v-model="form.latitude" placeholder="纬度" :step="0.000001" :precision="6" style="width: 180px" />
            <a-input-number v-model="form.longitude" placeholder="经度" :step="0.000001" :precision="6" style="width: 180px" />
            <a-button type="outline" size="small" :icon="iconLocation" @click="getLocationByAddress">
              解析坐标
            </a-button>
          </a-space>
        </a-space>
      </a-form-item>
      <a-form-item label="封面图片">
        <div class="cover-upload">
          <div class="cover-preview" v-if="form.cover_image" @click="handleSelectCover">
            <img :src="'file:///' + form.cover_image.replace(/\\/g, '/')" />
            <div class="cover-mask"><icon-edit /></div>
          </div>
          <div v-else class="cover-placeholder" @click="handleSelectCover">
            <icon-plus :size="20" />
            <span>点击选择封面</span>
          </div>
          <input
            ref="coverInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onCoverFileChange"
          />
        </div>
      </a-form-item>
      <a-form-item label="标签">
        <a-input
          v-model="tagsText"
          placeholder="用逗号分隔，如：自驾游,徒步,亲子游"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="旅行描述">
        <a-textarea
          v-model="form.description"
          placeholder="记录这次旅行的心情和故事..."
          :auto-size="{ minRows: 3, maxRows: 6 }"
          allow-clear
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconLocation, IconEdit, IconPlus } from '@arco-design/web-vue/es/icon'

const props = defineProps({
  modelValue: Boolean,
  travel: Object
})

const emit = defineEmits(['update:modelValue', 'success'])

const iconLocation = IconLocation
const iconEdit = IconEdit
const iconPlus = IconPlus

const api = window.electronAPI || {}

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.travel?.id)

const formRef = ref()
const coverInputRef = ref()

const form = reactive({
  title: '',
  description: '',
  location: '',
  latitude: null,
  longitude: null,
  start_date: '',
  end_date: '',
  cover_image: '',
  tags: []
})

const tagsText = ref('')

const resetForm = () => {
  Object.assign(form, {
    title: '',
    description: '',
    location: '',
    latitude: null,
    longitude: null,
    start_date: '',
    end_date: '',
    cover_image: '',
    tags: []
  })
  tagsText.value = ''
  if (coverInputRef.value) coverInputRef.value.value = ''
}

watch(() => props.travel, (val) => {
  if (val) {
    Object.assign(form, {
      title: val.title || '',
      description: val.description || '',
      location: val.location || '',
      latitude: val.latitude ?? null,
      longitude: val.longitude ?? null,
      start_date: val.start_date || '',
      end_date: val.end_date || '',
      cover_image: val.cover_image || ''
    })
    try {
      const tags = val.tags ? (Array.isArray(val.tags) ? val.tags : JSON.parse(val.tags)) : []
      tagsText.value = tags.join(', ')
    } catch (e) {
      tagsText.value = val.tags || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

watch(visible, (v) => {
  if (!v) resetForm()
})

const rules = {
  title: [{ required: true, message: '请输入旅行名称' }]
}

const handleSelectCover = async () => {
  try {
    if (window.electronAPI && typeof window.electronAPI.selectFiles === 'function') {
      const result = await window.electronAPI.selectFiles()
      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        form.cover_image = result.filePaths[0]
        return
      }
    }
  } catch (e) {
    console.warn('Electron 文件选择失败，回退到浏览器方式:', e.message)
  }
  if (coverInputRef.value) {
    coverInputRef.value.click()
  }
}

const onCoverFileChange = (e) => {
  const files = e.target.files
  if (!files || !files.length) return
  const file = files[0]
  form.cover_image = file.name
  Message.info('浏览器模式下仅能获取文件名，完整路径需在 Electron 环境中使用')
}

const getLocationByAddress = async () => {
  if (!form.location) {
    Message.warning('请先输入地点名称')
    return
  }
  try {
    form.latitude = 25.6065
    form.longitude = 100.2679
    Message.success('已填充示例坐标')
  } catch (e) {
    Message.error('坐标解析失败')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) {
    Message.warning('表单未就绪，请稍后重试')
    return
  }

  if (!window.electronAPI || !window.electronAPI.travel) {
    Message.error('系统运行环境异常：无法连接主进程，请重启应用')
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  let tags = []
  try {
    if (tagsText.value && tagsText.value.trim()) {
      tags = tagsText.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    }
  } catch (e) {
    tags = []
  }

  const data = {
    title: form.title || '',
    description: form.description || '',
    location: form.location || '',
    latitude: form.latitude !== undefined && form.latitude !== null ? form.latitude : null,
    longitude: form.longitude !== undefined && form.longitude !== null ? form.longitude : null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    cover_image: form.cover_image || null,
    tags
  }

  try {
    const travelApi = window.electronAPI.travel
    if (isEdit.value) {
      if (!props.travel || !props.travel.id) {
        Message.error('编辑失败：旅行 ID 缺失')
        return
      }
      await travelApi.update(props.travel.id, data)
      Message.success('旅行已更新')
    } else {
      const id = await travelApi.create(data)
      Message.success(`旅行创建成功（ID: ${id}）`)
    }
    emit('success')
    visible.value = false
  } catch (e) {
    console.error('旅行保存失败:', e)
    Message.error('操作失败：' + (e && e.message ? e.message : '未知错误'))
  }
}
</script>

<style lang="less" scoped>
.cover-upload {
  display: flex;
}

.cover-preview,
.cover-placeholder {
  width: 180px;
  height: 110px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  border: 2px dashed #e8e0d4;
}

.cover-preview {
  border-style: solid;
  border-color: transparent;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover .cover-mask {
    opacity: 1;
  }
}

.cover-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cover-placeholder {
  background: #faf6f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #b0a08a;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #7eb8da;
    color: #7eb8da;
    background: #f5f9fc;
  }
}
</style>
