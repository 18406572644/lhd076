import { formatDate, formatFileSize, parseTags, getDateRange } from './index'
import { getTemplate, getActiveModules } from './reportTemplates'

const escapeHtml = (str) => {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const imageToBase64 = (filePath) => {
  return new Promise((resolve) => {
    if (!filePath) { resolve(''); return }
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } catch { resolve('') }
    }
    img.onerror = () => resolve('')
    img.src = 'file:///' + filePath.replace(/\\/g, '/')
  })
}

export const buildStyledHtml = (options) => {
  const {
    template = 'elegant',
    modules = {},
    customTitle = '',
    customSubtitle = '',
    customCover = '',
    data = {}
  } = options

  const tpl = getTemplate(template)
  const s = tpl.styles
  const activeModules = getActiveModules(modules)
  const activeIds = activeModules.map(m => m.id)

  const {
    title = '旅行总结报告',
    subtitle = '由 TravelMemory · 旅行记忆 自动生成',
    today = formatDate(new Date()),
    overview = { travels: 0, albums: 0, photos: 0, videos: 0, locations: 0, totalSize: 0 },
    summaryStats = [],
    travelList = [],
    expenseSummary = [],
    expenseTotal = 0,
    expensePerTrip = 0,
    coverPhotos = [],
    allPhotos = [],
    topTags = [],
    categoryNames = {},
    categoryColors = {},
    locations = []
  } = data

  const finalTitle = customTitle || title
  const finalSubtitle = customSubtitle || subtitle
  const coverStyle = customCover
    ? `background-image: url('file:///${customCover.replace(/\\/g, '/')}'); background-size: cover; background-position: center;`
    : ''
  const coverOverlay = customCover ? 'background: rgba(0,0,0,0.4); color: #fff;' : ''

  let sectionsHtml = ''

  if (activeIds.includes('overview')) {
    sectionsHtml += `
<section class="section">
  <h2 class="section-title">📊 旅行概览</h2>
  <div class="stats-grid">
    ${summaryStats.map(s => `
      <div class="stat-card" style="background: ${s.bg || '#fafafa'}">
        <div class="stat-icon" style="color: ${s.color || s.accent}">${s.icon}</div>
        <div class="stat-value" style="color: ${s.color || s.primary}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `).join('')}
  </div>
  <div class="overview-grid">
    <div class="overview-item"><span class="ov-label">旅行次数</span><span class="ov-value">${overview.travels} 次</span></div>
    <div class="overview-item"><span class="ov-label">相册数量</span><span class="ov-value">${overview.albums} 个</span></div>
    <div class="overview-item"><span class="ov-label">照片数量</span><span class="ov-value">${overview.photos} 张</span></div>
    <div class="overview-item"><span class="ov-label">视频数量</span><span class="ov-value">${overview.videos} 个</span></div>
    <div class="overview-item"><span class="ov-label">足迹地点</span><span class="ov-value">${overview.locations} 个</span></div>
    <div class="overview-item"><span class="ov-label">存储占用</span><span class="ov-value">${formatFileSize(overview.totalSize || 0)}</span></div>
  </div>
</section>`
  }

  if (activeIds.includes('expenses') && expenseTotal > 0) {
    sectionsHtml += `
<section class="section">
  <h2 class="section-title">💰 花费统计</h2>
  <div class="expense-header">
    <div class="expense-total">
      <div class="et-label">累计花费</div>
      <div class="et-value">¥ ${Number(expenseTotal).toFixed(2)}</div>
    </div>
    ${overview.travels > 0 ? `
    <div class="expense-avg">
      <div class="et-label">平均每次</div>
      <div class="et-value small">¥ ${Number(expensePerTrip || expenseTotal / overview.travels).toFixed(2)}</div>
    </div>` : ''}
  </div>
  <div class="expense-bars">
    ${expenseSummary.map(e => {
      const pct = (e.total / expenseTotal * 100).toFixed(1)
      return `
      <div class="expense-row">
        <div class="er-cat">${categoryNames[e.category] || e.category}</div>
        <div class="er-bar"><div class="er-fill" style="width:${pct}%;background:${categoryColors[e.category] || s.accent}"></div></div>
        <div class="er-amt">¥ ${Number(e.total).toFixed(2)} (${pct}%)</div>
      </div>`
    }).join('')}
  </div>
</section>`
  }

  if (activeIds.includes('itinerary') && travelList.length) {
    sectionsHtml += `
<section class="section">
  <h2 class="section-title">📝 行程安排</h2>
  <div class="itinerary-list">
    ${travelList.map(t => `
      <div class="itinerary-item">
        <div class="ii-dot"></div>
        <div class="ii-content">
          <div class="ii-title">${escapeHtml(t.title)}</div>
          <div class="ii-meta">
            ${t.location ? `<span>📍 ${escapeHtml(t.location)}</span>` : ''}
            ${t.start_date ? `<span>📅 ${t.start_date}${t.end_date ? ' ~ ' + t.end_date : ''}</span>` : ''}
            <span>⏱️ ${getDateRange(t.start_date, t.end_date)}天</span>
          </div>
          ${t.description ? `<div class="ii-desc">${escapeHtml(t.description)}</div>` : ''}
          <div class="ii-counts">
            <span>📷 ${t.media_count || 0} 张</span>
            <span>📁 ${t.album_count || 0} 个相册</span>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</section>`
  }

  if (activeIds.includes('map') && locations.length) {
    sectionsHtml += `
<section class="section">
  <h2 class="section-title">🗺️ 地图足迹</h2>
  <div class="locations-wrap">
    ${locations.map((loc, i) => `
      <div class="loc-item">
        <div class="loc-no">${i + 1}</div>
        <div class="loc-info">
          <div class="loc-name">${escapeHtml(loc.name || loc.location || '未知地点')}</div>
          ${loc.date ? `<div class="loc-date">${loc.date}</div>` : ''}
          ${loc.latitude && loc.longitude ? `<div class="loc-coord">${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</section>`
  }

  if (activeIds.includes('highlights') && coverPhotos.length) {
    const photos = coverPhotos.filter(p => p.file_type === 'image').slice(0, 12)
    sectionsHtml += `
<section class="section">
  <h2 class="section-title">📸 精选照片</h2>
  <div class="photo-grid highlight">
    ${photos.map((p, i) => `
      <div class="photo-item" style="aspect-ratio: ${i === 0 ? '2/1' : '1'}; grid-column: ${i === 0 ? 'span 2' : ''}">
        <img src="file:///${p.file_path.replace(/\\/g, '/')}" onerror="this.style.display='none'" />
        ${p.description ? `<div class="photo-caption">${escapeHtml(p.description)}</div>` : ''}
      </div>
    `).join('')}
  </div>
</section>`
  }

  if (activeIds.includes('thumbnails') && allPhotos.length) {
    const thumbs = allPhotos.filter(p => p.file_type === 'image')
    sectionsHtml += `
<section class="section">
  <h2 class="section-title">🖼️ 全部照片 (${thumbs.length}张)</h2>
  <div class="photo-grid thumbs">
    ${thumbs.map(p => `
      <div class="thumb-item">
        <img src="file:///${p.file_path.replace(/\\/g, '/')}" onerror="this.style.display='none'" />
      </div>
    `).join('')}
  </div>
</section>`
  }

  if (topTags.length && activeIds.includes('overview')) {
    sectionsHtml += `
<section class="section">
  <h2 class="section-title">🏷️ 热门标签</h2>
  <div class="tags-wrap">
    ${topTags.map((t, i) => {
      const colors = ['#5a9fc4', '#8bc9a0', '#e8a5b9', '#c4a77d', '#b59ad6', '#f2d59e', '#7eb8da', '#e67e22']
      return `<span class="tag-chip" style="background:${colors[i % colors.length]}22;color:${colors[i % colors.length]};font-size:${12 + Math.min(t.weight, 4) * 2}px">#${escapeHtml(t.name)} ×${t.count}</span>`
    }).join('')}
  </div>
</section>`
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(finalTitle)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${s.fontFamily};
  background: ${s.bodyBg};
  color: ${s.primary};
  line-height: 1.7;
  padding: 40px 20px;
}
.container {
  max-width: 860px;
  margin: 0 auto;
  background: ${s.containerBg};
  padding: 48px;
  border-radius: ${s.borderRadius};
  box-shadow: 0 10px 60px rgba(0,0,0,0.08);
  border: ${s.borderStyle};
}
.cover {
  text-align: center;
  padding: 60px 30px 40px;
  margin-bottom: 40px;
  border-radius: ${s.borderRadius};
  position: relative;
  overflow: hidden;
  ${coverStyle}
}
.cover-inner {
  position: relative;
  z-index: 2;
  padding: 20px;
  ${coverOverlay}
  border-radius: ${s.borderRadius};
}
.cover-icon { font-size: 56px; margin-bottom: 12px; }
.cover h1 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 10px;
  ${s.headingGradient !== 'none' ? `background: ${s.headingGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : `color: ${coverOverlay ? '#fff' : s.primary};`}
}
.cover .subtitle { font-size: 14px; opacity: 0.8; margin-bottom: 8px; }
.cover .date { font-size: 12px; opacity: 0.6; }
.section { margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px dashed rgba(128,128,128,0.2); }
.section:last-child { border-bottom: none; }
.section-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 20px;
  padding-left: 14px;
  border-left: 5px solid ${s.accent};
  ${s.headingGradient !== 'none' ? `background: ${s.headingGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : `color: ${s.primary};`}
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.stat-card {
  padding: 20px 14px;
  border-radius: ${s.borderRadius};
  text-align: center;
}
.stat-icon { font-size: 28px; margin-bottom: 6px; }
.stat-value { font-size: 26px; font-weight: 700; line-height: 1.1; }
.stat-label { font-size: 12px; color: ${s.secondary}; margin-top: 6px; letter-spacing: 0.5px; }
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.overview-item {
  padding: 14px 16px;
  background: rgba(0,0,0,0.02);
  border-radius: ${s.borderRadius};
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ov-label { font-size: 12px; color: ${s.secondary}; }
.ov-value { font-size: 15px; font-weight: 600; color: ${s.primary}; }
.expense-header {
  display: flex;
  gap: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(231,76,60,0.08), rgba(230,126,34,0.08));
  border-radius: ${s.borderRadius};
  margin-bottom: 20px;
}
.et-label { font-size: 11px; color: ${s.secondary}; letter-spacing: 1px; margin-bottom: 4px; }
.et-value { font-size: 30px; font-weight: 700; color: #e74c3c; font-family: 'Segoe UI', sans-serif; }
.et-value.small { font-size: 22px; color: #c0392b; }
.expense-bars { padding: 0 8px; }
.expense-row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
}
.er-cat { color: ${s.primary}; font-weight: 500; }
.er-bar { height: 10px; background: rgba(0,0,0,0.05); border-radius: 5px; overflow: hidden; }
.er-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; }
.er-amt { color: ${s.secondary}; white-space: nowrap; font-size: 12px; }
.itinerary-list { position: relative; padding-left: 28px; }
.itinerary-list::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: linear-gradient(180deg, ${s.accent}, transparent);
}
.itinerary-item { position: relative; margin-bottom: 22px; }
.ii-dot {
  position: absolute;
  left: -24px;
  top: 6px;
  width: 14px;
  height: 14px;
  background: ${s.accent};
  border: 3px solid ${s.containerBg};
  border-radius: 50%;
  box-shadow: 0 0 0 2px ${s.accent}44;
}
.ii-content {
  padding: 14px 18px;
  background: rgba(0,0,0,0.02);
  border-radius: ${s.borderRadius};
}
.ii-title { font-size: 17px; font-weight: 600; margin-bottom: 8px; color: ${s.primary}; }
.ii-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: ${s.secondary}; margin-bottom: 8px; }
.ii-desc { font-size: 13px; color: ${s.primary}; line-height: 1.6; margin-bottom: 8px; padding: 10px 14px; background: ${s.containerBg}; border-radius: 8px; border-left: 3px solid ${s.accent}; }
.ii-counts { display: flex; gap: 16px; font-size: 12px; color: ${s.secondary}; }
.locations-wrap {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.loc-item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(0,0,0,0.02);
  border-radius: ${s.borderRadius};
  align-items: flex-start;
}
.loc-no {
  width: 28px;
  height: 28px;
  background: ${s.accent};
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.loc-name { font-size: 14px; font-weight: 600; color: ${s.primary}; }
.loc-date { font-size: 11px; color: ${s.secondary}; margin-top: 2px; }
.loc-coord { font-size: 10px; color: ${s.secondary}; opacity: 0.7; margin-top: 2px; font-family: monospace; }
.photo-grid { display: grid; gap: 10px; }
.photo-grid.highlight { grid-template-columns: repeat(4, 1fr); }
.photo-grid.thumbs { grid-template-columns: repeat(6, 1fr); gap: 6px; }
.photo-item, .thumb-item {
  border-radius: ${s.borderRadius};
  overflow: hidden;
  background: rgba(0,0,0,0.03);
  position: relative;
}
.photo-item img, .thumb-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: #fff;
  font-size: 12px;
}
.tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 0; }
.tag-chip {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 20px;
  font-weight: 500;
}
.footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px dashed rgba(128,128,128,0.2);
  text-align: center;
  font-size: 12px;
  color: ${s.secondary};
  opacity: 0.8;
}
.footer .heart { color: #e74c3c; }
@media print {
  body { padding: 0; background: #fff; }
  .container { box-shadow: none; border: none; padding: 20px; }
  .section { page-break-inside: avoid; }
}
</style>
</head>
<body>
<div class="container">
  <div class="cover">
    <div class="cover-inner">
      <div class="cover-icon">✈️</div>
      <h1>${escapeHtml(finalTitle)}</h1>
      <div class="subtitle">${escapeHtml(finalSubtitle)}</div>
      <div class="date">报告生成 · ${today}</div>
    </div>
  </div>
  ${sectionsHtml}
  <div class="footer">
    <p>这份报告由 TravelMemory · 旅行记忆 自动生成</p>
    <p>愿每一段旅程都被温柔铭记 <span class="heart">❤</span></p>
  </div>
</div>
</body>
</html>`
}

export const buildWordDoc = async (options) => {
  const html = buildStyledHtml(options)
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${escapeHtml(options.customTitle || options.data?.title || '旅行报告')}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page { size: A4; margin: 2cm; }
body { font-family: 'Microsoft YaHei', 'SimSun', sans-serif; }
</style>
</head>
<body>
${html.replace(/^<!DOCTYPE html>[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*?<\/html>$/, '')}
</body>
</html>`
}

export const buildPptSlides = async (options) => {
  const {
    template = 'elegant',
    modules = {},
    customTitle = '',
    customSubtitle = '',
    data = {}
  } = options

  const tpl = getTemplate(template)
  const s = tpl.styles
  const activeModules = getActiveModules(modules)
  const activeIds = activeModules.map(m => m.id)

  const {
    title = '旅行总结报告',
    subtitle = '由 TravelMemory · 旅行记忆 自动生成',
    today = formatDate(new Date()),
    overview = { travels: 0, albums: 0, photos: 0, videos: 0, locations: 0 },
    summaryStats = [],
    travelList = [],
    expenseSummary = [],
    expenseTotal = 0,
    coverPhotos = [],
    topTags = [],
    categoryNames = {},
    categoryColors = {},
    locations = []
  } = data

  const finalTitle = customTitle || title
  const finalSubtitle = customSubtitle || subtitle

  const slides = []

  slides.push({
    type: 'cover',
    data: { title: finalTitle, subtitle: finalSubtitle, date: today, styles: s }
  })

  if (activeIds.includes('overview')) {
    slides.push({
      type: 'overview',
      data: { overview, summaryStats, styles: s }
    })
  }

  if (activeIds.includes('expenses') && expenseTotal > 0) {
    slides.push({
      type: 'expenses',
      data: { expenseTotal, expenseSummary, categoryNames, categoryColors, overview, styles: s }
    })
  }

  if (activeIds.includes('itinerary') && travelList.length) {
    const chunkSize = 3
    for (let i = 0; i < travelList.length; i += chunkSize) {
      slides.push({
        type: 'itinerary',
        data: { items: travelList.slice(i, i + chunkSize), page: Math.floor(i / chunkSize) + 1, total: Math.ceil(travelList.length / chunkSize), styles: s }
      })
    }
  }

  if (activeIds.includes('map') && locations.length) {
    slides.push({
      type: 'locations',
      data: { locations: locations.slice(0, 10), styles: s }
    })
  }

  if (activeIds.includes('highlights') && coverPhotos.length) {
    const photos = coverPhotos.filter(p => p.file_type === 'image').slice(0, 6)
    for (let i = 0; i < photos.length; i += 6) {
      slides.push({
        type: 'photos',
        data: { photos: photos.slice(i, i + 6), styles: s }
      })
    }
  }

  if (topTags.length && activeIds.includes('overview')) {
    slides.push({
      type: 'tags',
      data: { tags: topTags.slice(0, 20), styles: s }
    })
  }

  slides.push({
    type: 'end',
    data: { title: '感谢观看', subtitle: '愿每一段旅程都被温柔铭记 ❤️', styles: s }
  })

  return buildPptHtml(slides, s)
}

const buildPptHtml = (slides, s) => {
  const slidesHtml = slides.map((slide, idx) => {
    const bg = slide.type === 'cover' || slide.type === 'end'
      ? `background: ${s.bodyBg};`
      : `background: ${s.containerBg};`

    let content = ''
    switch (slide.type) {
      case 'cover':
        content = `
<div class="slide-content cover-slide">
  <div class="cover-icon-big">✈️</div>
  <h1 class="slide-cover-title">${escapeHtml(slide.data.title)}</h1>
  <div class="slide-cover-subtitle">${escapeHtml(slide.data.subtitle)}</div>
  <div class="slide-cover-date">${slide.data.date}</div>
</div>`
        break
      case 'overview':
        content = `
<div class="slide-content">
  <h2 class="slide-title">📊 旅行概览</h2>
  <div class="slide-stats">
    ${slide.data.summaryStats.slice(0, 4).map(st => `
      <div class="slide-stat">
        <div class="ss-icon">${st.icon}</div>
        <div class="ss-num">${st.value}</div>
        <div class="ss-label">${st.label}</div>
      </div>
    `).join('')}
  </div>
  <div class="slide-ov-details">
    <div>📁 相册：${slide.data.overview.albums} 个</div>
    <div>📍 地点：${slide.data.overview.locations} 个</div>
  </div>
</div>`
        break
      case 'expenses':
        content = `
<div class="slide-content">
  <h2 class="slide-title">💰 花费统计</h2>
  <div class="slide-exp-total">累计：¥ ${Number(slide.data.expenseTotal).toFixed(2)}</div>
  <div class="slide-exp-bars">
    ${slide.data.expenseSummary.slice(0, 6).map(e => {
      const pct = (e.total / slide.data.expenseTotal * 100).toFixed(1)
      return `
      <div class="seb-row">
        <span class="seb-cat">${slide.data.categoryNames[e.category] || e.category}</span>
        <div class="seb-bar"><div class="seb-fill" style="width:${pct}%;background:${slide.data.categoryColors[e.category] || s.accent}"></div></div>
        <span class="seb-amt">¥ ${Number(e.total).toFixed(2)}</span>
      </div>`
    }).join('')}
  </div>
</div>`
        break
      case 'itinerary':
        content = `
<div class="slide-content">
  <h2 class="slide-title">📝 行程安排 ${slide.data.total > 1 ? `(${slide.data.page}/${slide.data.total})` : ''}</h2>
  <div class="slide-it-list">
    ${slide.data.items.map(t => `
      <div class="si-item">
        <div class="si-title">✦ ${escapeHtml(t.title)}</div>
        <div class="si-meta">
          ${t.location ? `📍 ${escapeHtml(t.location)}` : ''}
          ${t.start_date ? ` · 📅 ${t.start_date}${t.end_date ? '~' + t.end_date : ''}` : ''}
          · ${getDateRange(t.start_date, t.end_date)}天
        </div>
      </div>
    `).join('')}
  </div>
</div>`
        break
      case 'locations':
        content = `
<div class="slide-content">
  <h2 class="slide-title">🗺️ 地图足迹</h2>
  <div class="slide-locs">
    ${slide.data.locations.map((l, i) => `
      <div class="sl-item">
        <span class="sl-no">${i + 1}</span>
        <span class="sl-name">${escapeHtml(l.name || l.location || '未知')}</span>
      </div>
    `).join('')}
  </div>
</div>`
        break
      case 'photos':
        content = `
<div class="slide-content">
  <h2 class="slide-title">📸 精选照片</h2>
  <div class="slide-photos">
    ${slide.data.photos.slice(0, 6).map(p => `
      <div class="sp-item"><img src="file:///${p.file_path.replace(/\\/g, '/')}" onerror="this.style.background='${s.bodyBg}'" /></div>
    `).join('')}
  </div>
</div>`
        break
      case 'tags':
        content = `
<div class="slide-content">
  <h2 class="slide-title">🏷️ 热门标签</h2>
  <div class="slide-tags">
    ${slide.data.tags.map((t, i) => {
      const colors = ['#5a9fc4', '#8bc9a0', '#e8a5b9', '#c4a77d', '#b59ad6', '#f2d59e', '#7eb8da', '#e67e22']
      return `<span class="st-tag" style="background:${colors[i % colors.length]}22;color:${colors[i % colors.length]}">#${escapeHtml(t.name)} ×${t.count}</span>`
    }).join('')}
  </div>
</div>`
        break
      case 'end':
        content = `
<div class="slide-content cover-slide">
  <div class="cover-icon-big">🌟</div>
  <h1 class="slide-cover-title">${escapeHtml(slide.data.title)}</h1>
  <div class="slide-cover-subtitle">${escapeHtml(slide.data.subtitle)}</div>
</div>`
        break
    }

    return `
<div class="ppt-slide" style="${bg}">
  ${content}
  <div class="slide-footer">${idx + 1} / ${slides.length} · TravelMemory</div>
</div>`
  }).join('')

  return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:p="urn:schemas-microsoft-com:office:powerpoint" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(slides[0]?.data?.title || '旅行报告')}</title>
<!--[if gte mso 9]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
</o:OfficeDocumentSettings>
</xml>
<![endif]-->
<style>
@page { size: 33.867cm 19.05cm; margin: 0; }
body {
  margin: 0;
  padding: 0;
  background: #333;
  font-family: ${s.fontFamily};
}
.ppt-slide {
  width: 33.867cm;
  height: 19.05cm;
  position: relative;
  overflow: hidden;
  margin: 20px auto;
  page-break-after: always;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  border-radius: 8px;
}
.slide-content {
  width: 100%;
  height: 100%;
  padding: 60px 80px;
  box-sizing: border-box;
  color: ${s.primary};
}
.slide-footer {
  position: absolute;
  bottom: 20px;
  right: 40px;
  font-size: 11px;
  color: ${s.secondary};
  opacity: 0.6;
}
.cover-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.cover-icon-big { font-size: 100px; margin-bottom: 20px; }
.slide-cover-title {
  font-size: 56px;
  font-weight: 700;
  margin-bottom: 16px;
  ${s.headingGradient !== 'none' ? `background: ${s.headingGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : ''}
}
.slide-cover-subtitle { font-size: 20px; color: ${s.secondary}; margin-bottom: 12px; }
.slide-cover-date { font-size: 14px; color: ${s.secondary}; opacity: 0.7; }
.slide-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 40px;
  padding-left: 18px;
  border-left: 6px solid ${s.accent};
  ${s.headingGradient !== 'none' ? `background: ${s.headingGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;` : ''}
}
.slide-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}
.slide-stat {
  padding: 30px 20px;
  background: rgba(0,0,0,0.03);
  border-radius: 16px;
  text-align: center;
}
.ss-icon { font-size: 40px; margin-bottom: 10px; }
.ss-num { font-size: 42px; font-weight: 700; color: ${s.accent}; line-height: 1; }
.ss-label { font-size: 14px; color: ${s.secondary}; margin-top: 8px; letter-spacing: 1px; }
.slide-ov-details {
  display: flex;
  gap: 60px;
  justify-content: center;
  font-size: 18px;
  color: ${s.secondary};
}
.slide-exp-total {
  font-size: 48px;
  font-weight: 700;
  color: #e74c3c;
  text-align: center;
  margin-bottom: 36px;
  font-family: 'Segoe UI', sans-serif;
}
.slide-exp-bars { max-width: 800px; margin: 0 auto; }
.seb-row {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 10px 0;
  font-size: 16px;
}
.seb-cat { font-weight: 500; }
.seb-bar { height: 16px; background: rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }
.seb-fill { height: 100%; border-radius: 8px; }
.seb-amt { color: ${s.secondary}; font-weight: 600; }
.slide-it-list { display: flex; flex-direction: column; gap: 20px; }
.si-item {
  padding: 16px 24px;
  background: rgba(0,0,0,0.03);
  border-left: 5px solid ${s.accent};
  border-radius: 0 12px 12px 0;
}
.si-title { font-size: 24px; font-weight: 600; margin-bottom: 6px; }
.si-meta { font-size: 14px; color: ${s.secondary}; }
.slide-locs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.sl-item {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px 20px;
  background: rgba(0,0,0,0.03);
  border-radius: 12px;
}
.sl-no {
  width: 36px;
  height: 36px;
  background: ${s.accent};
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}
.sl-name { font-size: 18px; font-weight: 500; }
.slide-photos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 12px;
  height: calc(100% - 120px);
}
.sp-item {
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0,0,0,0.05);
}
.sp-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.slide-tags { display: flex; flex-wrap: wrap; gap: 14px; padding: 10px 0; }
.st-tag {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 30px;
  font-size: 18px;
  font-weight: 500;
}
@media screen {
  body { padding: 20px 0; }
}
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`
}
