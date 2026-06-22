export const REPORT_MODULES = [
  { id: 'overview', name: '旅行概览', icon: '📊', default: true },
  { id: 'expenses', name: '花费统计', icon: '💰', default: true },
  { id: 'highlights', name: '精选照片', icon: '📸', default: true },
  { id: 'itinerary', name: '行程安排', icon: '📝', default: true },
  { id: 'map', name: '地图足迹', icon: '🗺️', default: true },
  { id: 'thumbnails', name: '全部照片缩略图', icon: '🖼️', default: false }
]

export const REPORT_TEMPLATES = {
  minimal: {
    id: 'minimal',
    name: '简约风',
    description: '干净利落的极简风格，突出内容本身',
    preview: '📄',
    styles: {
      bodyBg: '#fafafa',
      containerBg: '#ffffff',
      primary: '#2c3e50',
      secondary: '#7f8c8d',
      accent: '#3498db',
      borderRadius: '0px',
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      borderStyle: '1px solid #eee',
      headingGradient: 'none'
    }
  },
  magazine: {
    id: 'magazine',
    name: '杂志风',
    description: '时尚精致的杂志排版风格，富有设计感',
    preview: '📖',
    styles: {
      bodyBg: 'linear-gradient(180deg, #f8f5f0 0%, #faf8f5 100%)',
      containerBg: '#fffef9',
      primary: '#2c2416',
      secondary: '#8a7c6a',
      accent: '#c4a77d',
      borderRadius: '0px',
      fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif',
      borderStyle: '1px solid #e8e0d4',
      headingGradient: 'linear-gradient(135deg, #2c2416, #8a7c6a)'
    }
  },
  timeline: {
    id: 'timeline',
    name: '时间轴风',
    description: '以时间线为主线，清晰展现旅程脉络',
    preview: '⏳',
    styles: {
      bodyBg: 'linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 50%, #f5f0ff 100%)',
      containerBg: '#ffffff',
      primary: '#1e3a5f',
      secondary: '#5a7d9a',
      accent: '#5dade2',
      borderRadius: '12px',
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      borderStyle: '2px solid #d6eaf8',
      headingGradient: 'linear-gradient(135deg, #1e3a5f, #5dade2)'
    }
  },
  map: {
    id: 'map',
    name: '地图风',
    description: '以地图和旅行为主题的冒险风格',
    preview: '🗺️',
    styles: {
      bodyBg: 'linear-gradient(180deg, #f0ebe0 0%, #e8e0d0 100%)',
      containerBg: '#fdfbf7',
      primary: '#4a3728',
      secondary: '#8b7355',
      accent: '#c0392b',
      borderRadius: '8px',
      fontFamily: '"Georgia", "KaiTi", "楷体", serif',
      borderStyle: '2px dashed #c9b896',
      headingGradient: 'linear-gradient(135deg, #4a3728, #8b7355)'
    }
  },
  elegant: {
    id: 'elegant',
    name: '优雅风',
    description: '温暖优雅的文艺风格，细腻而有温度',
    preview: '🎨',
    styles: {
      bodyBg: 'linear-gradient(180deg, #fef5f0 0%, #fff5eb 100%)',
      containerBg: '#ffffff',
      primary: '#6b4423',
      secondary: '#a67b5b',
      accent: '#e67e22',
      borderRadius: '16px',
      fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      borderStyle: '1px solid #f5e6d3',
      headingGradient: 'linear-gradient(135deg, #6b4423, #e67e22)'
    }
  }
}

export const getTemplate = (id) => REPORT_TEMPLATES[id] || REPORT_TEMPLATES.elegant

export const getActiveModules = (modulesConfig) => {
  return REPORT_MODULES.map(m => ({
    ...m,
    active: modulesConfig[m.id] !== undefined ? modulesConfig[m.id] : m.default
  })).filter(m => m.active)
}
