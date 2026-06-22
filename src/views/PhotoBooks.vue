<template>
  <div class="page-container photobooks-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="section-title">实体相册 / 照片书</h2>
        <p class="section-desc">将旅行回忆制作成精美实体相册，支持多种模板，可导出高清 PDF 打印</p>
      </div>
      <div class="header-right">
        <a-button type="primary" :icon="iconPlus" @click="showCreateModal = true">
          新建照片书
        </a-button>
      </div>
    </div>

    <div class="template-showcase">
      <h3 class="showcase-title">选择模板开始创作</h3>
      <div class="template-grid">
        <div
          v-for="t in templates"
          :key="t.id"
          class="template-card"
          @click="startWithTemplate(t.id)"
        >
          <div class="template-preview" :class="t.id">
            <div class="preview-cover">
              <div class="cover-photo"></div>
              <div class="cover-title">{{ t.name }}</div>
            </div>
          </div>
          <div class="template-info">
            <div class="template-name">{{ t.name }}</div>
            <div class="template-desc">{{ t.description }}</div>
            <div class="template-meta">
              <span>{{ t.pages?.length || 6 }} 页起</span>
              <span>{{ t.width }}×{{ t.height }}mm</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-divider>我的照片书</a-divider>

    <div class="books-grid" v-if="bookList.length">
      <div
        v-for="book in bookList"
        :key="book.id"
        class="book-card"
        @click="openBook(book.id)"
      >
        <div class="book-cover">
          <img v-if="book.cover_image" :src="'file:///' + book.cover_image.replace(/\\/g, '/')" />
          <div v-else class="cover-placeholder">
            <icon-book :size="36" />
          </div>
          <div class="book-overlay">
            <a-button type="primary" size="mini">编辑</a-button>
          </div>
        </div>
        <div class="book-info">
          <div class="book-title">{{ book.title }}</div>
          <div class="book-meta">
            <span>{{ book.page_count || 0 }} 页</span>
            <span>{{ formatDate(book.updated_at) }}</span>
          </div>
        </div>
        <a-dropdown class="book-menu" @click.stop>
          <template #content>
            <a-doption @click="editBook(book.id)">编辑</a-doption>
            <a-doption @click="duplicateBook(book)">复制</a-doption>
            <a-doption @click="deleteBook(book.id)" style="color:#f55555">删除</a-doption>
          </template>
          <a-button type="text" size="mini" :icon="iconMore" />
        </a-dropdown>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 200 160" width="160" height="128">
          <rect x="30" y="20" width="140" height="120" rx="8" fill="#f5efe0" stroke="#c4a77d" stroke-width="1.5"/>
          <rect x="50" y="40" width="50" height="40" rx="4" fill="#fff" stroke="#a8d8ea" stroke-width="1"/>
          <rect x="110" y="40" width="50" height="40" rx="4" fill="#fff" stroke="#a8d8ea" stroke-width="1"/>
          <rect x="50" y="90" width="110" height="8" rx="2" fill="#e8e0d4"/>
          <rect x="50" y="105" width="80" height="8" rx="2" fill="#e8e0d4"/>
        </svg>
      </div>
      <h3>还没有照片书</h3>
      <p>选择一个模板，开始制作你的第一本实体相册吧</p>
      <a-button type="primary" :icon="iconPlus" @click="showCreateModal = true">
        开始创作
      </a-button>
    </div>

    <a-modal
      v-model:visible="showCreateModal"
      title="新建照片书"
      width="560px"
      @ok="createBook"
      @cancel="showCreateModal = false"
      :confirm-loading="creating"
    >
      <a-form layout="vertical" :model="createForm">
        <a-form-item label="照片书名称" field="title" :rules="[{ required: true, message: '请输入名称' }]">
          <a-input v-model="createForm.title" placeholder="如：2024 云南之旅相册" allow-clear />
        </a-form-item>
        <a-form-item label="选择模板">
          <a-radio-group v-model="createForm.templateType" type="card" style="width: 100%">
            <a-radio value="a4_hardcover" style="width: 33.33%">
              <div class="template-option">
                <div class="option-icon a4">📘</div>
                <div class="option-name">A4 精装</div>
              </div>
            </a-radio>
            <a-radio value="polaroid" style="width: 33.33%">
              <div class="template-option">
                <div class="option-icon polaroid">📸</div>
                <div class="option-name">拍立得</div>
              </div>
            </a-radio>
            <a-radio value="postcard" style="width: 33.33%">
              <div class="template-option">
                <div class="option-icon postcard">✉️</div>
                <div class="option-name">明信片</div>
              </div>
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="描述" optional>
          <a-textarea
            v-model="createForm.description"
            placeholder="记录这本相册的故事..."
            :auto-size="{ minRows: 2, maxRows: 4 }"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="关联相册" optional>
          <a-select v-model="createForm.album_id" placeholder="选择要使用的相册" allow-clear>
            <a-option v-for="a in albumList" :key="a.id" :value="a.id">
              {{ a.title }} ({{ a.media_count || 0 }} 张)
            </a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <PhotoBookEditor
      v-if="editingBookId"
      :book-id="editingBookId"
      :album-id="currentAlbumId"
      :template-type="currentTemplateType"
      :initial-photos="initialPhotos"
      @close="closeEditor"
      @saved="onBookSaved"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { IconPlus, IconBook, IconMore } from '@arco-design/web-vue/es/icon'
import PhotoBookEditor from '@/components/PhotoBookEditor.vue'
import { PHOTO_BOOK_TEMPLATES } from '@/utils/photoBookTemplates'
import { formatDate } from '@/utils'

const router = useRouter()
const api = window.electronAPI || {}

const iconPlus = IconPlus
const iconBook = IconBook
const iconMore = IconMore

const bookList = ref([])
const albumList = ref([])
const showCreateModal = ref(false)
const creating = ref(false)
const editingBookId = ref(null)
const currentAlbumId = ref(null)
const currentTemplateType = ref('a4_hardcover')
const initialPhotos = ref([])

const templates = computed(() => Object.values(PHOTO_BOOK_TEMPLATES))

const createForm = reactive({
  title: '',
  description: '',
  templateType: 'a4_hardcover',
  album_id: null
})

const loadBooks = async () => {
  try {
    if (api.photobook && typeof api.photobook.list === 'function') {
      bookList.value = await api.photobook.list() || []
    } else {
      bookList.value = []
    }
  } catch (e) {
    console.error('加载照片书列表失败:', e)
    bookList.value = []
  }
}

const loadAlbums = async () => {
  try {
    if (api.album && typeof api.album.list === 'function') {
      albumList.value = await api.album.list() || []
    } else {
      albumList.value = []
    }
  } catch (e) {
    console.error('加载相册列表失败:', e)
    albumList.value = []
  }
}

const startWithTemplate = async (templateId) => {
  createForm.templateType = templateId
  showCreateModal.value = true
}

const createBook = async () => {
  if (!createForm.title?.trim()) {
    Message.warning('请输入照片书名称')
    return
  }

  creating.value = true
  try {
    if (createForm.album_id) {
      const media = await api.media.getByAlbum(createForm.album_id)
      initialPhotos.value = media.filter(m => m.file_type === 'image')
    }

    currentTemplateType.value = createForm.templateType
    currentAlbumId.value = createForm.album_id || null
    editingBookId.value = null
    showCreateModal.value = false

    createForm.title = ''
    createForm.description = ''
    createForm.templateType = 'a4_hardcover'
    createForm.album_id = null
  } catch (e) {
    console.error('创建照片书失败:', e)
    Message.error('创建失败：' + e.message)
  } finally {
    creating.value = false
  }
}

const openBook = (id) => {
  editingBookId.value = id
}

const editBook = (id) => {
  editingBookId.value = id
}

const duplicateBook = async (book) => {
  try {
    const data = await api.photobook.full(book.id)
    const newTitle = book.title + ' (副本)'

    const newId = await api.photobook.create({
      album_id: book.album_id,
      title: newTitle,
      description: book.description,
      template_type: book.template_type,
      config: data.config
    })

    if (data.pages) {
      for (const page of data.pages) {
        const pageId = await api.photobook.pageCreate({
          photo_book_id: newId,
          page_number: page.page_number,
          template_id: page.template_id,
          background_color: page.background_color,
          background_image: page.background_image,
          config: page.config,
          sort_order: page.sort_order
        })

        if (page.elements) {
          for (const el of page.elements) {
            await api.photobook.elementCreate({
              page_id: pageId,
              element_type: el.element_type,
              media_id: el.media_id,
              content: el.content,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              z_index: el.z_index,
              style: el.style,
              config: el.config
            })
          }
        }
      }
    }

    Message.success('照片书已复制')
    await loadBooks()
  } catch (e) {
    console.error('复制失败:', e)
    Message.error('复制失败：' + e.message)
  }
}

const deleteBook = (id) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这本照片书吗？删除后无法恢复。',
    okText: '删除',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.photobook.delete(id)
        Message.success('已删除')
        await loadBooks()
      } catch (e) {
        Message.error('删除失败')
      }
    }
  })
}

const closeEditor = () => {
  editingBookId.value = null
  initialPhotos.value = []
  currentAlbumId.value = null
  loadBooks()
}

const onBookSaved = () => {
  loadBooks()
}

onMounted(() => {
  loadBooks()
  loadAlbums()
})
</script>

<style lang="less" scoped>
.photobooks-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;

    .section-title {
      margin: 0 0 6px;
      font-size: 22px;
      color: #4a4a4a;
    }

    .section-desc {
      margin: 0;
      font-size: 13px;
      color: #8a8a8a;
    }
  }

  .template-showcase {
    margin-bottom: 20px;

    .showcase-title {
      font-size: 15px;
      font-weight: 600;
      color: #4a4a4a;
      margin: 0 0 16px;
    }
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .template-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

    &:hover {
      transform: translateY(-4px);
      border-color: #7eb8da;
      box-shadow: 0 8px 24px rgba(126, 184, 218, 0.2);
    }

    .template-preview {
      height: 200px;
      background: linear-gradient(135deg, #f5f0e6, #e8e0d4);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;

      &.a4_hardcover .preview-cover {
        width: 100px;
        height: 140px;
      }

      &.polaroid .preview-cover {
        width: 90px;
        height: 120px;
        background: #fff;
        padding: 8px 8px 28px 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

        .cover-photo {
          height: calc(100% - 20px);
          background: linear-gradient(135deg, #a8d8ea, #7eb8da);
        }

        .cover-title {
          position: static;
          color: #333;
          font-size: 10px;
          padding-top: 8px;
        }
      }

      &.postcard .preview-cover {
        width: 130px;
        height: 92px;

        .cover-title {
          font-size: 12px;
          bottom: 10px;
        }
      }

      .preview-cover {
        position: relative;
        background: linear-gradient(135deg, #a8d8ea, #7eb8da);
        border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        overflow: hidden;

        .cover-photo {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #a8d8ea, #7eb8da, #c4a77d);
        }

        .cover-title {
          position: absolute;
          bottom: 15px;
          left: 0;
          right: 0;
          text-align: center;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
      }
    }

    .template-info {
      padding: 14px 16px;

      .template-name {
        font-size: 15px;
        font-weight: 600;
        color: #4a4a4a;
        margin-bottom: 4px;
      }

      .template-desc {
        font-size: 12px;
        color: #8a8a8a;
        margin-bottom: 10px;
        line-height: 1.5;
      }

      .template-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #aaa;
      }
    }
  }

  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .book-card {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid #f0ebe3;
    transition: all 0.25s ease;
    position: relative;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
      border-color: #e0d8c8;

      .book-overlay {
        opacity: 1;
      }
    }

    .book-cover {
      aspect-ratio: 3 / 4;
      background: linear-gradient(135deg, #f5f0e6, #e8e0d4);
      position: relative;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cover-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #c4a77d;
      }

      .book-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
    }

    .book-info {
      padding: 12px 14px;

      .book-title {
        font-size: 14px;
        font-weight: 600;
        color: #4a4a4a;
        margin-bottom: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .book-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #aaa;
      }
    }

    .book-menu {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 6px;
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #8a8a8a;
    background: #fff;
    border-radius: 14px;
    border: 1px dashed #e8e0d4;

    .empty-icon { opacity: 0.9; margin-bottom: 16px; }
    h3 { font-size: 18px; color: #4a4a4a; margin: 0 0 8px; }
    p { font-size: 13px; margin: 0 0 24px; }
  }

  .template-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0;
    gap: 8px;

    .option-icon {
      font-size: 32px;

      &.a4 { color: #7eb8da; }
      &.polaroid { color: #c4a77d; }
      &.postcard { color: #a8d8ea; }
    }

    .option-name {
      font-size: 12px;
      color: #666;
    }
  }
}
</style>
