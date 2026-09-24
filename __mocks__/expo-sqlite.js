let rows = [];

const mockDb = {
  execAsync: jest.fn(() => Promise.resolve()),
  runAsync: jest.fn((query, params) => {
    if (query.includes('INSERT INTO') || query.includes('INSERT OR REPLACE INTO')) {
      // params structure: [id, url, method, body, status, createdAt, meta, retryCount, terminalReason]
      const [id, url, method, body, status, createdAt, meta, retryCount, terminalReason] = params || [];
      // Remove any existing with same id to simulate OR REPLACE
      rows = rows.filter(row => row.id !== id);
      rows.push({
        id,
        url,
        method,
        body: typeof body === 'string' ? body : JSON.stringify(body || {}),
        status: status || 'PENDING',
        createdAt: createdAt || new Date().toISOString(),
        meta: typeof meta === 'string' ? meta : JSON.stringify(meta || {}),
        retryCount: retryCount || 0,
        terminalReason: terminalReason || null,
      });
    }
    else if (query.includes('DELETE FROM')) {
      const [id] = params || [];
      rows = rows.filter(row => row.id !== id);
    }
    else if (query.includes("status = 'RETRY'")) {
      const [id] = params || [];
      const row = rows.find(r => r.id === id);
      if (row) {
        row.status = 'RETRY';
        row.retryCount = (row.retryCount || 0) + 1;
        row.terminalReason = null;
      }
    }
    else if (query.includes("status = 'FAILED'")) {
      const [reason, id] = params || [];
      const row = rows.find(r => r.id === id);
      if (row) {
        row.status = 'FAILED';
        row.terminalReason = reason;
      }
    }
    return Promise.resolve({ changes: 1, lastInsertRowId: 1 });
  }),
  getAllAsync: jest.fn((query, params) => {
    if (query.includes('SELECT * FROM')) {
      // Tanpa filter status (mis. getAllQueueItems) → semua baris.
      if (!query.includes('WHERE status IN')) {
        return Promise.resolve([...rows]);
      }
      // Return pending/retry rows sorted by createdAt
      const filtered = rows.filter(r => r.status === 'PENDING' || r.status === 'RETRY');
      return Promise.resolve(filtered);
    }
    return Promise.resolve([]);
  }),
  getFirstAsync: jest.fn((query, params) => {
    if (query.includes('PRAGMA user_version')) {
      return Promise.resolve({ user_version: 1 });
    }
    if (query.includes('COUNT(*)')) {
      return Promise.resolve({ c: rows.length });
    }
    return Promise.resolve(null);
  }),
  withExclusiveTransactionAsync: jest.fn(async (callback) => {
    return callback(mockDb);
  })
};

module.exports = {
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb)),
  _resetDb: () => {
    rows = [];
  },
  _getRows: () => rows,
  _setRows: (newRows) => {
    rows = newRows;
  }
};
