export const PHOTO_BOOK_TEMPLATES = {
  a4_hardcover: {
    id: 'a4_hardcover',
    name: 'A4 精装相册',
    description: '经典 A4 尺寸精装相册，适合珍藏旅行回忆',
    width: 210,
    height: 297,
    unit: 'mm',
    dpi: 300,
    pages: [
      { template_id: 'cover_front', name: '封面', is_cover: true },
      { template_id: 'page_1', name: '第 1 页' },
      { template_id: 'page_2', name: '第 2 页' },
      { template_id: 'page_3', name: '第 3 页' },
      { template_id: 'page_4', name: '第 4 页' },
      { template_id: 'cover_back', name: '封底', is_back_cover: true }
    ],
    pageLayouts: {
      cover_front: {
        name: '封面',
        elements: [
          { type: 'photo', x: 0, y: 0, width: 210, height: 297, z_index: 0 },
          { type: 'text', x: 20, y: 220, width: 170, height: 60, z_index: 1, content: '旅行记忆',
            style: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' } }
        ]
      },
      page_1: {
        name: '单张大图',
        elements: [
          { type: 'photo', x: 15, y: 15, width: 180, height: 267, z_index: 0 }
        ]
      },
      page_2: {
        name: '左右双图',
        elements: [
          { type: 'photo', x: 15, y: 20, width: 85, height: 120, z_index: 0 },
          { type: 'photo', x: 110, y: 20, width: 85, height: 120, z_index: 0 },
          { type: 'text', x: 20, y: 160, width: 170, height: 120, z_index: 1, content: '',
            style: { fontSize: 14, color: '#333333', textAlign: 'left' } }
        ]
      },
      page_3: {
        name: '四宫格',
        elements: [
          { type: 'photo', x: 15, y: 20, width: 85, height: 85, z_index: 0 },
          { type: 'photo', x: 110, y: 20, width: 85, height: 85, z_index: 0 },
          { type: 'photo', x: 15, y: 115, width: 85, height: 85, z_index: 0 },
          { type: 'photo', x: 110, y: 115, width: 85, height: 85, z_index: 0 }
        ]
      },
      page_4: {
        name: '一大两小',
        elements: [
          { type: 'photo', x: 15, y: 20, width: 120, height: 180, z_index: 0 },
          { type: 'photo', x: 145, y: 20, width: 50, height: 85, z_index: 0 },
          { type: 'photo', x: 145, y: 115, width: 50, height: 85, z_index: 0 },
          { type: 'text', x: 20, y: 220, width: 170, height: 60, z_index: 1, content: '',
            style: { fontSize: 12, color: '#666666', textAlign: 'center', fontStyle: 'italic' } }
        ]
      },
      cover_back: {
        name: '封底',
        elements: [
          { type: 'photo', x: 0, y: 0, width: 210, height: 297, z_index: 0 },
          { type: 'text', x: 20, y: 250, width: 170, height: 30, z_index: 1, content: '© TravelMemory',
            style: { fontSize: 14, color: '#ffffff', textAlign: 'center' } }
        ]
      }
    }
  },

  polaroid: {
    id: 'polaroid',
    name: '拍立得风格',
    description: '复古拍立得风格，每张照片都像一张独立的回忆',
    width: 150,
    height: 200,
    unit: 'mm',
    dpi: 300,
    pages: [
      { template_id: 'polaroid_1', name: '第 1 页' },
      { template_id: 'polaroid_2', name: '第 2 页' },
      { template_id: 'polaroid_3', name: '第 3 页' },
      { template_id: 'polaroid_4', name: '第 4 页' }
    ],
    pageLayouts: {
      polaroid_1: {
        name: '三张竖排',
        elements: [
          { type: 'polaroid_photo', x: 15, y: 10, width: 60, height: 80, z_index: 0, rotation: -3 },
          { type: 'polaroid_photo', x: 75, y: 25, width: 60, height: 80, z_index: 1, rotation: 2 },
          { type: 'polaroid_photo', x: 30, y: 100, width: 60, height: 80, z_index: 2, rotation: 1 }
        ]
      },
      polaroid_2: {
        name: '四大拍立得',
        elements: [
          { type: 'polaroid_photo', x: 10, y: 10, width: 60, height: 80, z_index: 0, rotation: -2 },
          { type: 'polaroid_photo', x: 80, y: 10, width: 60, height: 80, z_index: 1, rotation: 2 },
          { type: 'polaroid_photo', x: 10, y: 100, width: 60, height: 80, z_index: 2, rotation: 1 },
          { type: 'polaroid_photo', x: 80, y: 100, width: 60, height: 80, z_index: 3, rotation: -1 }
        ]
      },
      polaroid_3: {
        name: '倾斜堆叠',
        elements: [
          { type: 'polaroid_photo', x: 25, y: 30, width: 70, height: 95, z_index: 0, rotation: -5 },
          { type: 'polaroid_photo', x: 45, y: 45, width: 70, height: 95, z_index: 1, rotation: 3 },
          { type: 'polaroid_photo', x: 35, y: 60, width: 70, height: 95, z_index: 2, rotation: -2 }
        ]
      },
      polaroid_4: {
        name: '两大一小',
        elements: [
          { type: 'polaroid_photo', x: 10, y: 15, width: 65, height: 90, z_index: 0, rotation: -3 },
          { type: 'polaroid_photo', x: 75, y: 15, width: 65, height: 90, z_index: 1, rotation: 2 },
          { type: 'polaroid_photo', x: 40, y: 115, width: 70, height: 70, z_index: 2, rotation: 0 }
        ]
      }
    }
  },

  postcard: {
    id: 'postcard',
    name: '明信片合集',
    description: '文艺明信片风格，每张都是一张可以寄出的风景',
    width: 148,
    height: 105,
    unit: 'mm',
    dpi: 300,
    pages: [
      { template_id: 'postcard_1', name: '明信片 1' },
      { template_id: 'postcard_2', name: '明信片 2' },
      { template_id: 'postcard_3', name: '明信片 3' },
      { template_id: 'postcard_4', name: '明信片 4' },
      { template_id: 'postcard_5', name: '明信片 5' },
      { template_id: 'postcard_6', name: '明信片 6' }
    ],
    pageLayouts: {
      postcard_1: {
        name: '满幅风景',
        elements: [
          { type: 'photo', x: 0, y: 0, width: 148, height: 105, z_index: 0 },
          { type: 'text', x: 10, y: 75, width: 128, height: 25, z_index: 1, content: 'Greetings from...',
            style: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'left',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)' } }
        ]
      },
      postcard_2: {
        name: '带邮戳',
        elements: [
          { type: 'photo', x: 5, y: 5, width: 90, height: 65, z_index: 0 },
          { type: 'decoration', x: 110, y: 10, width: 30, height: 30, z_index: 1,
            content: 'stamp', style: { border: '2px dashed #999', borderRadius: '4px' } },
          { type: 'text', x: 10, y: 78, width: 128, height: 20, z_index: 2, content: '',
            style: { fontSize: 11, color: '#333333', textAlign: 'left', fontStyle: 'italic' } }
        ]
      },
      postcard_3: {
        name: '双图拼贴',
        elements: [
          { type: 'photo', x: 5, y: 5, width: 65, height: 95, z_index: 0 },
          { type: 'photo', x: 78, y: 5, width: 65, height: 45, z_index: 0 },
          { type: 'photo', x: 78, y: 55, width: 65, height: 45, z_index: 0 }
        ]
      },
      postcard_4: {
        name: '复古边框',
        elements: [
          { type: 'decoration', x: 0, y: 0, width: 148, height: 105, z_index: 0,
            content: 'border', style: { border: '8px solid #f5f0e6', boxSizing: 'border-box' } },
          { type: 'photo', x: 10, y: 10, width: 128, height: 85, z_index: 1 }
        ]
      },
      postcard_5: {
        name: '文字为主',
        elements: [
          { type: 'photo', x: 0, y: 0, width: 148, height: 105, z_index: 0,
            style: { filter: 'brightness(0.4)' } },
          { type: 'text', x: 15, y: 25, width: 118, height: 55, z_index: 1, content: '旅行的意义\n不在于目的地\n而在于过程',
            style: { fontSize: 14, color: '#ffffff', textAlign: 'center', lineHeight: 1.8,
              fontWeight: '300', letterSpacing: '2px' } }
        ]
      },
      postcard_6: {
        name: '日期印记',
        elements: [
          { type: 'photo', x: 0, y: 0, width: 148, height: 105, z_index: 0 },
          { type: 'text', x: 10, y: 80, width: 60, height: 20, z_index: 1, content: '2024.06',
            style: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', textAlign: 'left',
              fontFamily: 'Courier New, monospace' } }
        ]
      }
    }
  }
}

export const DECORATION_ELEMENTS = [
  { id: 'stamp_1', name: '邮戳1', type: 'decoration', svg: true },
  { id: 'stamp_2', name: '邮戳2', type: 'decoration', svg: true },
  { id: 'heart', name: '爱心', type: 'decoration', emoji: '❤️' },
  { id: 'star', name: '星星', type: 'decoration', emoji: '⭐' },
  { id: 'camera', name: '相机', type: 'decoration', emoji: '📷' },
  { id: 'airplane', name: '飞机', type: 'decoration', emoji: '✈️' },
  { id: 'map', name: '地图', type: 'decoration', emoji: '🗺️' },
  { id: 'compass', name: '指南针', type: 'decoration', emoji: '🧭' },
  { id: 'sun', name: '太阳', type: 'decoration', emoji: '☀️' },
  { id: 'mountain', name: '山', type: 'decoration', emoji: '🏔️' },
  { id: 'palm', name: '棕榈树', type: 'decoration', emoji: '🌴' },
  { id: 'flower', name: '花朵', type: 'decoration', emoji: '🌸' }
]

export const getTemplateById = (id) => {
  return PHOTO_BOOK_TEMPLATES[id] || PHOTO_BOOK_TEMPLATES.a4_hardcover
}

export const mmToPx = (mm, dpi = 300) => {
  return (mm * dpi) / 25.4
}

export const pxToMm = (px, dpi = 300) => {
  return (px * 25.4) / dpi
}
