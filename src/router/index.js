import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', icon: 'icon-home' }
      },
      {
        path: 'travels',
        name: 'Travels',
        component: () => import('@/views/Travels.vue'),
        meta: { title: '旅行', icon: 'icon-suitcase' }
      },
      {
        path: 'travels/:id',
        name: 'TravelDetail',
        component: () => import('@/views/TravelDetail.vue'),
        meta: { title: '旅行详情', hidden: true }
      },
      {
        path: 'media',
        name: 'Media',
        component: () => import('@/views/MediaLibrary.vue'),
        meta: { title: '媒体库', icon: 'icon-image' }
      },
      {
        path: 'albums',
        name: 'Albums',
        component: () => import('@/views/Albums.vue'),
        meta: { title: '相册', icon: 'icon-picture' }
      },
      {
        path: 'albums/:id',
        name: 'AlbumDetail',
        component: () => import('@/views/AlbumDetail.vue'),
        meta: { title: '相册详情', hidden: true }
      },
      {
        path: 'photobooks',
        name: 'PhotoBooks',
        component: () => import('@/views/PhotoBooks.vue'),
        meta: { title: '照片书', icon: 'icon-book' }
      },
      {
        path: 'timeline',
        name: 'Timeline',
        component: () => import('@/views/Timeline.vue'),
        meta: { title: '时间轴', icon: 'icon-calendar' }
      },
      {
        path: 'map',
        name: 'Map',
        component: () => import('@/views/TravelMap.vue'),
        meta: { title: '足迹地图', icon: 'icon-location' }
      },
      {
        path: 'tools',
        name: 'Tools',
        component: () => import('@/views/Tools.vue'),
        meta: { title: '照片工具', icon: 'icon-tool' }
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/Report.vue'),
        meta: { title: '旅行报告', icon: 'icon-file' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
