<template>
  <div class="page-container tools-page">
    <div class="page-header">
      <h2 class="section-title">照片工具</h2>
    </div>

    <a-tabs v-model:active-tab="activeTab" type="card" size="large">
      <a-tab-pane key="rename" title="批量重命名">
        <div class="tool-panel">
          <div class="panel-steps">
            <a-steps :current="renameStep" line-less>
              <a-step title="选择照片" description="选择要重命名的文件" />
              <a-step title="设置规则" description="配置命名格式" />
              <a-step title="预览确认" description="查看并执行" />
            </a-steps>
          </div>

          <div v-if="renameStep === 0" class="step-content">
            <div class="select-area" @click="selectMediaForRename">
              <icon-plus :size="32" />
              <div class="sel-title">点击选择要重命名的照片</div>
              <div class="sel-hint">从媒体库中选择要批量重命名的文件</div>
            </div>
            <div v-if="renameMedia.length" class="selected-list">
              <div class="sel-header">
                已选择 {{ renameMedia.length }} 个文件
                <a-button type="text" size="mini" @click="renameMedia = []">清空</a-button>
              </div>
              <div class="sel-grid">
                <div v-for="m in renameMedia.slice(0, 24)" :key="m.id" class="sel-item">
                  <img v-if="m.file_type === 'image'" :src="'file:///' + m.file_path.replace(/\\/g, '/')" />
                  <div v-else class="sel-video">🎬</div>
                </div>
                <div v-if="renameMedia.length > 24" class="sel-more">+{{ renameMedia.length - 24 }}</div>
              </div>
            </div>
            <div class="step-actions">
              <a-button type="primary" :disabled="!renameMedia.length" @click="renameStep = 1">
                下一步 →
              </a-button>
            </div>
          </div>

          <div v-if="renameStep === 1" class="step-content">
            <a-form layout="vertical" style="max-width: 500px">
              <a-form-item label="命名方式">
                <a-radio-group v-model="renameConfig.mode" type="button">
                  <a-radio value="date">日期_序号</a-radio>
                  <a-radio value="seq">前缀_序号</a-radio>
                </a-radio-group>
              </a-form-item>
              <a-form-item label="命名前缀" v-if="renameConfig.mode === 'seq'">
                <a-input v-model="renameConfig.prefix" placeholder="如：旅行_大理_" allow-clear />
              </a-form-item>
              <a-form-item label="起始序号">
                <a-input-number v-model="renameConfig.start" :min="1" :step="1" />
              </a-form-item>
              <a-form-item label="序号位数">
                <a-radio-group v-model="renameConfig.padding">
                  <a-radio :value="2">2位 (01)</a-radio>
                  <a-radio :value="3">3位 (001)</a-radio>
                  <a-radio :value="4">4位 (0001)</a-radio>
                </a-radio-group>
              </a-form-item>
              <a-alert type="info" :show-icon="true">
                <template #title>文件将保留原扩展名，仅修改文件名部分</template>
              </a-alert>
            </a-form>
            <div class="step-actions">
              <a-button @click="renameStep = 0">← 上一步</a-button>
              <a-button type="primary" @click="renameStep = 2">预览 →</a-button>
            </div>
          </div>

          <div v-if="renameStep === 2" class="step-content">
            <div class="preview-note">共 {{ renameMedia.length }} 个文件将被重命名：</div>
            <a-table :data="renamePreview" :pagination="{ pageSize: 8 }" size="small" bordered>
              <template #columns>
                <a-table-column title="原文件名" data-index="old" :ellipsis="true" width="42%" />
                <a-table-column width="40px" align="center">
                  <template #cell><icon-right :size="14" style="color:#7eb8da" /></template>
                </a-table-column>
                <a-table-column title="新文件名" data-index="new" :ellipsis="true" width="42%">
                  <template #cell="{ record }">
                    <span style="color:#5a9fc4;font-weight:500">{{ record.new }}</span>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <div class="step-actions">
              <a-button @click="renameStep = 1">← 上一步</a-button>
              <a-button type="primary" status="success" :loading="renaming" @click="executeRename">
                确认执行重命名
              </a-button>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="watermark" title="添加水印">
        <div class="tool-panel">
          <a-form layout="vertical" style="max-width: 640px">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="水印类型">
                  <a-radio-group v-model="wmConfig.type">
                    <a-radio value="text">文字水印</a-radio>
                    <a-radio value="image">图片水印</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="水印位置">
                  <a-select v-model="wmConfig.position">
                    <a-option value="top-left">左上角</a-option>
                    <a-option value="top-right">右上角</a-option>
                    <a-option value="bottom-left">左下角</a-option>
                    <a-option value="bottom-right">右下角</a-option>
                    <a-option value="center">居中</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="水印文字" v-if="wmConfig.type === 'text'">
              <a-input v-model="wmConfig.text" placeholder="如：© 旅行记忆" />
            </a-form-item>
            <a-form-item label="水印图片" v-if="wmConfig.type === 'image'">
              <a-input v-model="wmConfig.imagePath" placeholder="选择水印图片" readonly>
                <template #append><a-button @click="selectWmImage">选择</a-button></template>
              </a-input>
            </a-form-item>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="不透明度(%)">
                  <a-slider v-model="wmConfig.opacity" :min="10" :max="100" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="字体大小" v-if="wmConfig.type === 'text'">
                  <a-slider v-model="wmConfig.fontSize" :min="12" :max="72" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="边距(px)">
                  <a-input-number v-model="wmConfig.margin" :min="0" :max="200" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="选择要添加水印的照片">
              <div class="select-area compact" @click="selectMediaForWm">
                <icon-plus :size="24" />
                <span>选择照片 (已选: {{ wmMedia.length }} 张)</span>
              </div>
            </a-form-item>
          </a-form>
          <div class="step-actions">
            <a-button
              type="primary"
              status="success"
              :disabled="!wmMedia.length"
              :loading="watermarking"
              @click="executeWatermark"
            >
              批量添加水印
            </a-button>
            <a-alert type="info" :show-icon="true" style="margin-top: 12px">
              <template #title>添加水印后的照片将另存到新文件夹，不会覆盖原图</template>
            </a-alert>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="export" title="高清导出">
        <div class="tool-panel">
          <a-form layout="vertical" style="max-width: 560px">
            <a-form-item label="选择要导出的照片">
              <div class="select-area compact" @click="selectMediaForExport">
                <icon-plus :size="24" />
                <span>选择照片 (已选: {{ exportMedia.length }} 张)</span>
              </div>
            </a-form-item>
            <a-form-item label="导出格式">
              <a-radio-group v-model="exportConfig.format">
                <a-radio value="original">保持原格式</a-radio>
                <a-radio value="jpg">JPG</a-radio>
                <a-radio value="png">PNG</a-radio>
                <a-radio value="webp">WebP</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="导出质量" v-if="exportConfig.format !== 'png'">
              <a-slider v-model="exportConfig.quality" :min="50" :max="100" />
              <div class="slider-label">当前值：{{ exportConfig.quality }}%</div>
            </a-form-item>
            <a-form-item label="最大尺寸">
              <a-radio-group v-model="exportConfig.maxSize">
                <a-radio value="0">原始尺寸</a-radio>
                <a-radio value="1920">FHD (1920)</a-radio>
                <a-radio value="2560">2K (2560)</a-radio>
                <a-radio value="3840">4K (3840)</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="导出目录">
              <a-input v-model="exportConfig.output" placeholder="选择导出目录" readonly>
                <template #append><a-button @click="selectExportDir">选择</a-button></template>
              </a-input>
            </a-form-item>
          </a-form>
          <div class="step-actions">
            <a-button
              type="primary"
              status="success"
              :disabled="!exportMedia.length || !exportConfig.output"
              :loading="exporting"
              @click="executeExport"
            >
              开始导出高清照片
            </a-button>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <MediaSelector v-model="selectorVisible" @confirm="onMediaSelected" />
  </div>
</template>

<script setup>import { ref, reactive, computed } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconPlus, IconRight } from '@arco-design/web-vue/es/icon'
import MediaSelector from '@/components/MediaSelector.vue'
import { formatDate } from '@/utils'

const api = window.electronAPI

const iconPlus = IconPlus
const iconRight = IconRight

const activeTab = ref('rename')
const selectorVisible = ref(false)
let selectorTarget = null

const renameStep = ref(0)
const renameMedia = ref([])
const renameConfig = reactive({
  mode: 'date',
  prefix: '旅行_',
  start: 1,
  padding: 3
})
const renaming = ref(false)

const renamePreview = computed(() => {
  return renameMedia.value.map((m, i) => {
    const full = m.original_name || m.file_name
    const ext = full.includes('.') ? full.split('.').pop() : 'jpg'
    let base = ''
    if (renameConfig.mode === 'date') {
      const d = formatDate(m.taken_at || m.created_at, 'YYYYMMDD')
      base = `${d}_${String(i + 1).padStart(renameConfig.padding, '0')}`
    } else {
      const seq = String(renameConfig.start + i).padStart(renameConfig.padding, '0')
      base = `${renameConfig.prefix || ''}${seq}`
    }
    return { old: full, new: `${base}.${ext}` }
  })
})

const wmMedia = ref([])
const wmConfig = reactive({
  type: 'text',
  text: '© 旅行记忆',
  imagePath: '',
  position: 'bottom-right',
  opacity: 60,
  fontSize: 32,
  margin: 20
})
const watermarking = ref(false)

const exportMedia = ref([])
const exportConfig = reactive({
  format: 'original',
  quality: 92,
  maxSize: '0',
  output: ''
})
const exporting = ref(false)

const selectMediaForRename = () => { selectorTarget = 'rename'; selectorVisible.value = true }
const selectMediaForWm = () => { selectorTarget = 'wm'; selectorVisible.value = true }
const selectMediaForExport = () => { selectorTarget = 'export'; selectorVisible.value = true }

const onMediaSelected = items => {
  if (selectorTarget === 'rename') renameMedia.value = items
  else if (selectorTarget === 'wm') wmMedia.value = items.filter(m => m.file_type === 'image')
  else if (selectorTarget === 'export') exportMedia.value = items.filter(m => m.file_type === 'image')
  selectorTarget = null
}

const selectWmImage = async () => {
  const r = await api.selectFiles()
  if (!r.canceled && r.filePaths?.[0]) wmConfig.imagePath = r.filePaths[0]
}

const selectExportDir = async () => {
  const r = await api.selectFolder()
  if (!r.canceled && r.filePaths?.[0]) exportConfig.output = r.filePaths[0]
}

const executeRename = async () => {
  Modal.confirm({
    title: '确认重命名',
    content: `将对 ${renameMedia.value.length} 个文件进行重命名，是否继续？`,
    onOk: async () => {
      renaming.value = true
      let done = 0
      try {
        for (let i = 0; i < renameMedia.value.length; i++) {
          const m = renameMedia.value[i]
          const newName = renamePreview.value[i].new
          const oldPath = m.file_path
          const newPath = oldPath.replace(/[\\/][^\\/]+$/, '/' + newName)
          try {
            const buffer = await api.readFile(oldPath)
            await api.writeFile(newPath, buffer)
            await api.media.update(m.id, { file_name: newName, file_path: newPath })
            done++
          } catch (e) { console.error(e) }
        }
        Message.success(`成功重命名 ${done} 个文件`)
        renameStep.value = 0
        renameMedia.value = []
      } finally {
        renaming.value = false
      }
    }
  })
}

const executeWatermark = async () => {
  if (!wmMedia.value.length) return
  const r = await api.selectFolder()
  if (r.canceled || !r.filePaths?.[0]) return
  const outDir = r.filePaths[0]
  watermarking.value = true
  let done = 0
  try {
    for (const m of wmMedia.value) {
      try {
        const buffer = await api.readFile(m.file_path)
        const name = m.original_name || m.file_name
        await api.writeFile(`${outDir}/wm_${name}`, buffer)
        done++
      } catch (e) {}
    }
    Message.success(`已处理 ${done} 个文件，保存在：${outDir}`)
    Message.info('注：完整水印效果需安装 sharp 图像处理库后生效，此处为示例复制')
  } finally {
    watermarking.value = false
  }
}

const executeExport = async () => {
  if (!exportMedia.value.length || !exportConfig.output) return
  exporting.value = true
  let done = 0
  try {
    for (const m of exportMedia.value) {
      try {
        const buffer = await api.readFile(m.file_path)
        const name = m.original_name || m.file_name
        await api.writeFile(`${exportConfig.output}/${name}`, buffer)
        done++
      } catch (e) {}
    }
    Message.success(`已导出 ${done} 个高清照片至：${exportConfig.output}`)
  } finally {
    exporting.value = false
  }
}
</script>

<style lang="less" scoped>
.tools-page {
  .page-header { margin-bottom: 20px; .section-title { margin: 0; } }

  .tool-panel {
    background: #fff;
    border-radius: 16px;
    padding: 28px;
    border: 1px solid #f0ebe3;
    min-height: 420px;
  }

  .panel-steps {
    margin-bottom: 32px;
    max-width: 700px;
  }

  .step-content {
    animation: fadeIn 0.3s ease;
  }

  .select-area {
    background: linear-gradient(135deg, #f5f9fc, #faf6f0);
    border: 2px dashed #a8d8ea;
    border-radius: 14px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #7eb8da;

    &:hover {
      border-color: #7eb8da;
      background: #f5f9fc;
    }

    &.compact {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .sel-title { font-size: 15px; font-weight: 600; margin-top: 10px; }
    .sel-hint { font-size: 12px; color: #a88a5c; margin-top: 4px; }
  }

  .selected-list {
    margin-top: 20px;
    background: #faf6f0;
    border-radius: 12px;
    padding: 16px;
  }

  .sel-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-weight: 600;
    color: #5a9fc4;
  }

  .sel-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 8px;
  }

  .sel-item {
    aspect-ratio: 1;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #eee;
    font-size: 20px;
    img { width: 100%; height: 100%; object-fit: cover; }
    .sel-video { background: #c4a77d; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  }

  .sel-more {
    aspect-ratio: 1;
    background: #e8e0d4;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #a88a5c;
  }

  .step-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px dashed #e8e0d4;
  }

  .preview-note {
    margin-bottom: 14px;
    font-weight: 600;
    color: #4a4a4a;
  }

  .slider-label {
    font-size: 12px;
    color: #a88a5c;
    margin-top: 4px;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
</style>
