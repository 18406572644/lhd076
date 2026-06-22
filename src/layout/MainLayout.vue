<template>
  <a-layout class="main-layout">
    <aside class="sidebar">
      <div class="logo-section">
        <div class="logo-icon">
          <svg viewBox="0 0 48 48" width="32" height="32">
            <defs>
              <linearGradient id="lg1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#a8d8ea"/>
                <stop offset="100%" style="stop-color:#7eb8da"/>
              </linearGradient>
            </defs>
            <rect x="6" y="12" width="36" height="28" rx="3" fill="#faf6f0" stroke="#c4a77d" stroke-width="1.5"/>
            <circle cx="24" cy="26" r="8" fill="url(#lg1)" stroke="#7eb8da" stroke-width="1.5"/>
            <circle cx="24" cy="26" r="3" fill="#faf6f0"/>
            <rect x="10" y="9" width="6" height="4" rx="1" fill="#c4a77d"/>
          </svg>
        </div>
        <div class="logo-text">
          <div class="logo-title">TravelMemory</div>
          <div class="logo-subtitle">旅行记忆</div>
        </div>
      </div>

      <nav class="nav-menu">
        <div
          v-for="item in menuItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)"
        >
          <span class="nav-icon">
            <component :is="item.icon" />
          </span>
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-deco"></div>
        <div class="footer-text">记录每一段美好旅程</div>
      </div>
    </aside>

    <a-layout class="content-layout">
      <header class="top-header">
        <div class="header-left">
          <a-breadcrumb>
            <a-breadcrumb-item v-for="(item, idx) in breadcrumbs" :key="idx">
              {{ item }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>
        <div class="header-right">
          <a-button type="outline" :icon="iconUpload" @click="handleImport" size="small">
            导入媒体
          </a-button>
          <a-tooltip content="设置">
            <a-button type="text" :icon="iconSettings" shape="circle" />
          </a-tooltip>
        </div>
      </header>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconHome,
  IconCamera,
  IconImage,
  IconFileImage,
  IconCalendar,
  IconLocation,
  IconTool,
  IconFile,
  IconUpload,
  IconSettings
} from '@arco-design/web-vue/es/icon'
import ImportModal from '@/components/ImportModal.vue'
import { useAppStore } from '@/stores/app'
import { ref } from 'vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const importVisible = ref(false)

const iconUpload = IconUpload
const iconSettings = IconSettings

const iconMap = {
  'icon-home': IconHome,
  'icon-suitcase': IconCamera,
  'icon-image': IconImage,
  'icon-picture': IconFileImage,
  'icon-calendar': IconCalendar,
  'icon-location': IconLocation,
  'icon-tool': IconTool,
  'icon-file': IconFile
}

const menuItems = [
  { path: '/dashboard', label: '首页', icon: IconHome },
  { path: '/travels', label: '旅行', icon: IconCamera },
  { path: '/media', label: '媒体库', icon: IconImage },
  { path: '/albums', label: '相册', icon: IconFileImage },
  { path: '/timeline', label: '时间轴', icon: IconCalendar },
  { path: '/map', label: '足迹地图', icon: IconLocation },
  { path: '/tools', label: '照片工具', icon: IconTool },
  { path: '/report', label: '旅行报告', icon: IconFile }
]

const isActive = (path) => {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(path)
}

const navigate = (path) => {
  router.push(path)
}

const breadcrumbs = computed(() => {
  const crumbs = ['TravelMemory']
  const meta = route.meta
  if (meta?.title) crumbs.push(meta.title)
  if (route.params.id) {
    crumbs.push('详情')
  }
  return crumbs
})

const handleImport = () => {
  importVisible.value = true
}

onMounted(async () => {
  try {
    await appStore.init()
  } catch (e) {
    console.error('Init failed:', e)
  }
})
</script>

<style lang="less" scoped>
.main-layout {
  height: 100%;
  display: flex;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #f5efe6 0%, #ede5d5 100%);
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e8e0d4;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle at top right, rgba(126, 184, 218, 0.1), transparent 70%);
    pointer-events: none;
  }
}

.logo-section {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.logo-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(196, 167, 125, 0.2);
}

.logo-text {
  .logo-title {
    font-size: 16px;
    font-weight: 700;
    color: #5a9fc4;
    letter-spacing: -0.5px;
    line-height: 1.2;
  }
  .logo-subtitle {
    font-size: 11px;
    color: #c4a77d;
    margin-top: 2px;
    letter-spacing: 2px;
  }
}

.nav-menu {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #6a5a48;
  font-size: 14px;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.7);
    color: #7eb8da;
  }

  &.active {
    background: linear-gradient(135deg, #7eb8da 0%, #a8d8ea 100%);
    color: #fff;
    box-shadow: 0 4px 12px rgba(126, 184, 218, 0.35);

    &::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: #c4a77d;
      border-radius: 0 3px 3px 0;
    }
  }
}

.nav-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.nav-label {
  flex: 1;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px 20px;
  position: relative;
}

.footer-deco {
  height: 1px;
  background: linear-gradient(90deg, transparent, #c4a77d, transparent);
  margin-bottom: 12px;
}

.footer-text {
  font-size: 11px;
  color: #a89880;
  text-align: center;
  font-style: italic;
  letter-spacing: 1px;
}

.content-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #faf6f0;
}

.top-header {
  height: 56px;
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #f0ebe3;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-content {
  flex: 1;
  overflow: hidden;
  background: #faf6f0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
