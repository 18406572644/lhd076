const Database = require('better-sqlite3')

class TravelDB {
  constructor(dbPath) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS travels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        latitude REAL,
        longitude REAL,
        start_date TEXT,
        end_date TEXT,
        cover_image TEXT,
        tags TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        travel_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        cover_image TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (travel_id) REFERENCES travels(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        travel_id INTEGER,
        file_name TEXT NOT NULL,
        original_name TEXT,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        mime_type TEXT,
        width INTEGER,
        height INTEGER,
        duration INTEGER,
        thumbnail_path TEXT,
        taken_at TEXT,
        latitude REAL,
        longitude REAL,
        location TEXT,
        camera TEXT,
        title TEXT,
        description TEXT,
        tags TEXT,
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (travel_id) REFERENCES travels(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS album_media (
        album_id INTEGER NOT NULL,
        media_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY (album_id, media_id),
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        travel_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'CNY',
        description TEXT,
        expense_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (travel_id) REFERENCES travels(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS itinerary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        travel_id INTEGER NOT NULL,
        day_index INTEGER DEFAULT 1,
        time_slot TEXT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        latitude REAL,
        longitude REAL,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (travel_id) REFERENCES travels(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_media_travel ON media(travel_id);
      CREATE INDEX IF NOT EXISTS idx_media_taken ON media(taken_at);
      CREATE INDEX IF NOT EXISTS idx_album_media_album ON album_media(album_id);
      CREATE INDEX IF NOT EXISTS idx_album_media_media ON album_media(media_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_travel ON expenses(travel_id);
      CREATE INDEX IF NOT EXISTS idx_itinerary_travel ON itinerary(travel_id);

      CREATE TABLE IF NOT EXISTS photo_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        template_type TEXT NOT NULL DEFAULT 'a4_hardcover',
        page_count INTEGER DEFAULT 0,
        cover_image TEXT,
        config TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS photo_book_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_book_id INTEGER NOT NULL,
        page_number INTEGER NOT NULL DEFAULT 1,
        template_id TEXT,
        background_color TEXT DEFAULT '#ffffff',
        background_image TEXT,
        config TEXT,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (photo_book_id) REFERENCES photo_books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS photo_book_elements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL,
        element_type TEXT NOT NULL,
        media_id INTEGER,
        content TEXT,
        x REAL DEFAULT 0,
        y REAL DEFAULT 0,
        width REAL DEFAULT 100,
        height REAL DEFAULT 100,
        rotation REAL DEFAULT 0,
        z_index INTEGER DEFAULT 0,
        style TEXT,
        config TEXT,
        FOREIGN KEY (page_id) REFERENCES photo_book_pages(id) ON DELETE CASCADE,
        FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_photo_book_pages_book ON photo_book_pages(photo_book_id);
      CREATE INDEX IF NOT EXISTS idx_photo_book_elements_page ON photo_book_elements(page_id);
    `)
  }

  all(sql, params = []) {
    return this.db.prepare(sql).all(...params)
  }

  get(sql, params = []) {
    return this.db.prepare(sql).get(...params)
  }

  run(sql, params = []) {
    const info = this.db.prepare(sql).run(...params)
    return { lastInsertRowid: info.lastInsertRowid, changes: info.changes }
  }

  insert(table, data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
    const info = this.db.prepare(sql).run(values)
    return info.lastInsertRowid
  }

  update(table, data, where) {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ')
    const values = [...Object.values(data), ...Object.values(where)]
    const whereClause = Object.keys(where).map(k => `${k} = ?`).join(' AND ')
    const sql = `UPDATE ${table} SET ${sets} WHERE ${whereClause}`
    const info = this.db.prepare(sql).run(values)
    return info.changes
  }

  delete(table, where) {
    const values = Object.values(where)
    const whereClause = Object.keys(where).map(k => `${k} = ?`).join(' AND ')
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`
    const info = this.db.prepare(sql).run(values)
    return info.changes
  }

  getTravels() {
    return this.db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM media m WHERE m.travel_id = t.id) as media_count,
        (SELECT COUNT(*) FROM albums a WHERE a.travel_id = t.id) as album_count
      FROM travels t ORDER BY COALESCE(t.start_date, t.created_at) DESC
    `).all()
  }

  getTravel(id) {
    return this.db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM media m WHERE m.travel_id = t.id) as media_count,
        (SELECT COUNT(*) FROM albums a WHERE a.travel_id = t.id) as album_count
      FROM travels t WHERE t.id = ?
    `).get(id)
  }

  createTravel(data) {
    return this.insert('travels', {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      cover_image: data.cover_image || null,
      tags: data.tags ? JSON.stringify(data.tags) : null
    })
  }

  updateTravel(id, data) {
    const updateData = {}
    const allowed = ['title', 'description', 'location', 'latitude', 'longitude', 'start_date', 'end_date', 'cover_image', 'tags']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = key === 'tags' ? JSON.stringify(data[key]) : data[key]
      }
    }
    updateData.updated_at = new Date().toISOString()
    return this.update('travels', updateData, { id })
  }

  deleteTravel(id) {
    return this.delete('travels', { id })
  }

  getAlbums() {
    return this.db.prepare(`
      SELECT a.*, t.title as travel_title,
        (SELECT COUNT(*) FROM album_media am WHERE am.album_id = a.id) as media_count
      FROM albums a LEFT JOIN travels t ON a.travel_id = t.id
      ORDER BY a.created_at DESC
    `).all()
  }

  getAlbum(id) {
    return this.db.prepare(`
      SELECT a.*, t.title as travel_title,
        (SELECT COUNT(*) FROM album_media am WHERE am.album_id = a.id) as media_count
      FROM albums a LEFT JOIN travels t ON a.travel_id = t.id
      WHERE a.id = ?
    `).get(id)
  }

  createAlbum(data) {
    return this.insert('albums', {
      travel_id: data.travel_id || null,
      title: data.title,
      description: data.description || null,
      cover_image: data.cover_image || null
    })
  }

  updateAlbum(id, data) {
    const updateData = {}
    const allowed = ['travel_id', 'title', 'description', 'cover_image']
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key]
    }
    updateData.updated_at = new Date().toISOString()
    return this.update('albums', updateData, { id })
  }

  deleteAlbum(id) {
    return this.delete('albums', { id })
  }

  getMediaList(filters = {}) {
    let sql = 'SELECT * FROM media WHERE 1=1'
    const params = []
    if (filters.travel_id) {
      sql += ' AND travel_id = ?'
      params.push(filters.travel_id)
    }
    if (filters.is_favorite) {
      sql += ' AND is_favorite = 1'
    }
    if (filters.search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR original_name LIKE ? OR tags LIKE ?)'
      const search = `%${filters.search}%`
      params.push(search, search, search, search)
    }
    if (filters.file_type) {
      if (Array.isArray(filters.file_type)) {
        sql += ` AND file_type IN (${filters.file_type.map(() => '?').join(',')})`
        params.push(...filters.file_type)
      } else {
        sql += ' AND file_type = ?'
        params.push(filters.file_type)
      }
    }
    sql += ' ORDER BY COALESCE(taken_at, created_at) DESC'
    if (filters.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }
    if (filters.offset) {
      sql += ' OFFSET ?'
      params.push(filters.offset)
    }
    return this.db.prepare(sql).all(...params)
  }

  getMedia(id) {
    return this.db.prepare('SELECT * FROM media WHERE id = ?').get(id)
  }

  createMedia(data) {
    return this.insert('media', {
      travel_id: data.travel_id || null,
      file_name: data.file_name,
      original_name: data.original_name || null,
      file_path: data.file_path,
      file_size: data.file_size || null,
      file_type: data.file_type || null,
      mime_type: data.mime_type || null,
      width: data.width || null,
      height: data.height || null,
      duration: data.duration || null,
      thumbnail_path: data.thumbnail_path || null,
      taken_at: data.taken_at || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      location: data.location || null,
      camera: data.camera || null,
      title: data.title || null,
      description: data.description || null,
      tags: data.tags ? JSON.stringify(data.tags) : null
    })
  }

  updateMedia(id, data) {
    const updateData = {}
    const allowed = ['travel_id', 'file_name', 'original_name', 'file_path', 'file_size', 'file_type',
      'mime_type', 'width', 'height', 'duration', 'thumbnail_path', 'taken_at', 'latitude', 'longitude',
      'location', 'camera', 'title', 'description', 'tags', 'is_favorite']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = key === 'tags' ? JSON.stringify(data[key]) : data[key]
      }
    }
    updateData.updated_at = new Date().toISOString()
    return this.update('media', updateData, { id })
  }

  deleteMedia(id) {
    return this.delete('media', { id })
  }

  bulkCreateMedia(items) {
    const stmt = this.db.prepare(`
      INSERT INTO media (travel_id, file_name, original_name, file_path, file_size, file_type,
        mime_type, width, height, duration, thumbnail_path, taken_at, latitude, longitude,
        location, camera, title, description, tags)
      VALUES (@travel_id, @file_name, @original_name, @file_path, @file_size, @file_type,
        @mime_type, @width, @height, @duration, @thumbnail_path, @taken_at, @latitude, @longitude,
        @location, @camera, @title, @description, @tags)
    `)
    const tx = this.db.transaction((list) => {
      const ids = []
      for (const item of list) {
        const data = { ...item }
        if (data.tags) data.tags = JSON.stringify(data.tags)
        const info = stmt.run(data)
        ids.push(info.lastInsertRowid)
      }
      return ids
    })
    return tx(items)
  }

  bulkUpdateMedia(ids, data) {
    const updateData = {}
    const allowed = ['travel_id', 'title', 'description', 'tags', 'is_favorite', 'taken_at', 'location']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = key === 'tags' ? JSON.stringify(data[key]) : data[key]
      }
    }
    updateData.updated_at = new Date().toISOString()
    const sets = Object.keys(updateData).map(k => `${k} = ?`).join(', ')
    const values = Object.values(updateData)
    const placeholders = ids.map(() => '?').join(', ')
    const sql = `UPDATE media SET ${sets} WHERE id IN (${placeholders})`
    const info = this.db.prepare(sql).run([...values, ...ids])
    return info.changes
  }

  addMediaToAlbum(mediaId, albumId) {
    try {
      return this.insert('album_media', { album_id: albumId, media_id: mediaId })
    } catch (e) {
      return 0
    }
  }

  removeMediaFromAlbum(mediaId, albumId) {
    return this.db.prepare('DELETE FROM album_media WHERE album_id = ? AND media_id = ?').run(albumId, mediaId).changes
  }

  getMediaByAlbum(albumId) {
    return this.db.prepare(`
      SELECT m.* FROM media m
      INNER JOIN album_media am ON m.id = am.media_id
      WHERE am.album_id = ?
      ORDER BY COALESCE(m.taken_at, m.created_at) ASC
    `).all(albumId)
  }

  getMediaByTravel(travelId) {
    return this.db.prepare(`
      SELECT * FROM media WHERE travel_id = ?
      ORDER BY COALESCE(taken_at, created_at) ASC
    `).all(travelId)
  }

  getExpenses(travelId) {
    return this.db.prepare('SELECT * FROM expenses WHERE travel_id = ? ORDER BY expense_date DESC, created_at DESC').all(travelId)
  }

  createExpense(data) {
    return this.insert('expenses', {
      travel_id: data.travel_id,
      category: data.category,
      amount: data.amount,
      currency: data.currency || 'CNY',
      description: data.description || null,
      expense_date: data.expense_date || null
    })
  }

  updateExpense(id, data) {
    const updateData = {}
    const allowed = ['category', 'amount', 'currency', 'description', 'expense_date']
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key]
    }
    return this.update('expenses', updateData, { id })
  }

  deleteExpense(id) {
    return this.delete('expenses', { id })
  }

  getExpenseSummary(travelId) {
    return this.db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses WHERE travel_id = ?
      GROUP BY category ORDER BY total DESC
    `).all(travelId)
  }

  getItinerary(travelId) {
    return this.db.prepare(`
      SELECT * FROM itinerary WHERE travel_id = ?
      ORDER BY day_index ASC, sort_order ASC
    `).all(travelId)
  }

  createItineraryItem(data) {
    return this.insert('itinerary', {
      travel_id: data.travel_id,
      day_index: data.day_index || 1,
      time_slot: data.time_slot || null,
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      sort_order: data.sort_order || 0
    })
  }

  updateItineraryItem(id, data) {
    const updateData = {}
    const allowed = ['day_index', 'time_slot', 'title', 'description', 'location', 'latitude', 'longitude', 'sort_order']
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key]
    }
    return this.update('itinerary', updateData, { id })
  }

  deleteItineraryItem(id) {
    return this.delete('itinerary', { id })
  }

  getAllTags() {
    const rows = this.db.prepare("SELECT tags FROM media WHERE tags IS NOT NULL AND tags != ''").all()
    const travels = this.db.prepare("SELECT tags FROM travels WHERE tags IS NOT NULL AND tags != ''").all()
    const tagSet = new Set()
    for (const row of [...rows, ...travels]) {
      try {
        const tags = JSON.parse(row.tags)
        for (const t of tags) tagSet.add(t)
      } catch (e) {}
    }
    return Array.from(tagSet).sort()
  }

  getOverviewStats() {
    const travels = this.db.prepare('SELECT COUNT(*) as count FROM travels').get().count
    const albums = this.db.prepare('SELECT COUNT(*) as count FROM albums').get().count
    const photos = this.db.prepare("SELECT COUNT(*) as count FROM media WHERE file_type = 'image'").get().count
    const videos = this.db.prepare("SELECT COUNT(*) as count FROM media WHERE file_type = 'video'").get().count
    const totalSize = this.db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM media').get().total
    const expenseTotal = this.db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total
    const locations = this.db.prepare('SELECT COUNT(DISTINCT location) as count FROM media WHERE location IS NOT NULL AND location != ""').get().count
    return { travels, albums, photos, videos, totalSize, expenseTotal, locations }
  }

  getTimelineData(year) {
    let sql = `
      SELECT 
        strftime('%Y-%m', COALESCE(taken_at, created_at)) as month,
        COUNT(*) as count,
        file_type
      FROM media
    `
    const params = []
    if (year) {
      sql += ` WHERE strftime('%Y', COALESCE(taken_at, created_at)) = ?`
      params.push(year.toString())
    }
    sql += ` GROUP BY month, file_type ORDER BY month ASC`
    return this.db.prepare(sql).all(...params)
  }

  getMapData() {
    const media = this.db.prepare(`
      SELECT id, file_name, file_path, file_type, thumbnail_path, taken_at, latitude, longitude, location, title
      FROM media WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `).all()
    const travels = this.db.prepare(`
      SELECT id, title, description, location, latitude, longitude, start_date, end_date, cover_image
      FROM travels WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `).all()
    return { media, travels }
  }

  getPhotoBooks() {
    return this.db.prepare(`
      SELECT pb.*, a.title as album_title,
        (SELECT COUNT(*) FROM photo_book_pages p WHERE p.photo_book_id = pb.id) as page_count
      FROM photo_books pb LEFT JOIN albums a ON pb.album_id = a.id
      ORDER BY pb.updated_at DESC
    `).all()
  }

  getPhotoBook(id) {
    return this.db.prepare(`
      SELECT pb.*, a.title as album_title,
        (SELECT COUNT(*) FROM photo_book_pages p WHERE p.photo_book_id = pb.id) as page_count
      FROM photo_books pb LEFT JOIN albums a ON pb.album_id = a.id
      WHERE pb.id = ?
    `).get(id)
  }

  createPhotoBook(data) {
    return this.insert('photo_books', {
      album_id: data.album_id || null,
      title: data.title,
      description: data.description || null,
      template_type: data.template_type || 'a4_hardcover',
      cover_image: data.cover_image || null,
      config: data.config ? JSON.stringify(data.config) : null
    })
  }

  updatePhotoBook(id, data) {
    const updateData = {}
    const allowed = ['album_id', 'title', 'description', 'template_type', 'cover_image', 'config']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = key === 'config' ? JSON.stringify(data[key]) : data[key]
      }
    }
    updateData.updated_at = new Date().toISOString()
    return this.update('photo_books', updateData, { id })
  }

  deletePhotoBook(id) {
    return this.delete('photo_books', { id })
  }

  getPhotoBookPages(bookId) {
    return this.db.prepare(`
      SELECT * FROM photo_book_pages 
      WHERE photo_book_id = ?
      ORDER BY sort_order ASC, page_number ASC
    `).all(bookId)
  }

  createPhotoBookPage(data) {
    return this.insert('photo_book_pages', {
      photo_book_id: data.photo_book_id,
      page_number: data.page_number || 1,
      template_id: data.template_id || null,
      background_color: data.background_color || '#ffffff',
      background_image: data.background_image || null,
      config: data.config ? JSON.stringify(data.config) : null,
      sort_order: data.sort_order || 0
    })
  }

  updatePhotoBookPage(id, data) {
    const updateData = {}
    const allowed = ['page_number', 'template_id', 'background_color', 'background_image', 'config', 'sort_order']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = key === 'config' ? JSON.stringify(data[key]) : data[key]
      }
    }
    return this.update('photo_book_pages', updateData, { id })
  }

  deletePhotoBookPage(id) {
    return this.delete('photo_book_pages', { id })
  }

  getPageElements(pageId) {
    return this.db.prepare(`
      SELECT * FROM photo_book_elements 
      WHERE page_id = ?
      ORDER BY z_index ASC, id ASC
    `).all(pageId)
  }

  createPageElement(data) {
    return this.insert('photo_book_elements', {
      page_id: data.page_id,
      element_type: data.element_type,
      media_id: data.media_id || null,
      content: data.content || null,
      x: data.x || 0,
      y: data.y || 0,
      width: data.width || 100,
      height: data.height || 100,
      rotation: data.rotation || 0,
      z_index: data.z_index || 0,
      style: data.style ? JSON.stringify(data.style) : null,
      config: data.config ? JSON.stringify(data.config) : null
    })
  }

  updatePageElement(id, data) {
    const updateData = {}
    const allowed = ['element_type', 'media_id', 'content', 'x', 'y', 'width', 'height', 'rotation', 'z_index', 'style', 'config']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateData[key] = (key === 'style' || key === 'config') ? JSON.stringify(data[key]) : data[key]
      }
    }
    return this.update('photo_book_elements', updateData, { id })
  }

  deletePageElement(id) {
    return this.delete('photo_book_elements', { id })
  }

  getPhotoBookFullData(bookId) {
    const book = this.getPhotoBook(bookId)
    if (!book) return null
    const pages = this.getPhotoBookPages(bookId)
    for (const page of pages) {
      try { page.config = page.config ? JSON.parse(page.config) : null } catch (e) { page.config = null }
      page.elements = this.getPageElements(page.id)
      for (const el of page.elements) {
        try { el.style = el.style ? JSON.parse(el.style) : null } catch (e) { el.style = null }
        try { el.config = el.config ? JSON.parse(el.config) : null } catch (e) { el.config = null }
      }
    }
    try { book.config = book.config ? JSON.parse(book.config) : null } catch (e) { book.config = null }
    book.pages = pages
    return book
  }
}

module.exports = TravelDB
