# Logger Documentation - Mobile NetManager

## Problem Solved: Terminal Corruption & Messy Output ✅

Terminal Anda menjadi berantakan/bahasa aneh karena:
1. **Terlalu banyak console.log** yang tidak terkontrol
2. **ANSI escape codes** dari WebSocket dan React Compiler yang tidak proper
3. **Tidak ada environment-based logging** untuk memfilter output
4. **`process.stdout` tidak ada di React Native** - causes crash

## Solution: Custom Logger Utility

### Files Created/Modified:
- ✅ **utils/logger.ts** - Logger utility TANPA process.stdout dependency
- ✅ **.env** - Environment variables untuk mengontrol logging
- ✅ **app/_layout.tsx** - Mengganti console.log → logger
- ✅ **context/SocketContext.tsx** - Mengganti console.log → logger.socket (disabled by default)
- ✅ **context/AuthContext.tsx** - Mengganti console.log → logger.auth

### How It Works

Logger otomatis:
- ✅ **TANPA process.stdout** - works di React Native
- ✅ Detect jika terminal support colors (TTY)
- ✅ Disable ANSI colors di React Native untuk avoid corruption
- ✅ Disable logging di production (`EXPO_DEBUG=false`)
- ✅ Group logs by category (auth, socket, sync, db)
- ✅ Format output dengan emoji untuk readability
- ✅ Error selalu ditampilkan (bypass DEBUG flag)

### Environment Variables

Di file [.env](.env):
```bash
# Enable verbose logging (default: true untuk development)
EXPO_DEBUG=true

# Socket.IO logging (sering menyebabkan terminal corruption)
EXPO_DEBUG_SOCKET=false

# Use ANSI colors (HANYA untuk Node.js terminal, NEVER enable di React Native!)
EXPO_USE_COLORS=false
```

**IMPORTANT:** `EXPO_USE_COLORS` harus **false** di React Native untuk menghindari terminal corruption!

### Logger API

```typescript
import logger from '@/utils/logger';

// General logging
logger.log('Info message');                    // [NetManager] ✓ Info message
logger.warn('Warning message');                // [NetManager] ⚠ Warning message
logger.error('Error message');                 // [NetManager] ✗ Error message (selalu tampil)
logger.info('Info with emoji');                // [NetManager] ℹ Info with emoji

// Category-specific logging
logger.auth('User logged in');                 // [NetManager] [AUTH] User logged in
logger.socket('WebSocket connected');          // [NetManager] [SOCKET] WebSocket connected (disabled by default)
logger.sync('Data synced');                    // [NetManager] [SYNC] Data synced
logger.db('Database initialized');             // [NetManager] [DB] Database initialized
```

### Migration from console.log

**Before:**
```typescript
console.log('[AuthContext] User logged in:', user.email);
console.warn('[WS Mobile] Connection error:', error);
console.error('[SyncService] Failed to sync:', error);
```

**After:**
```typescript
logger.auth('User logged in:', user.email);
logger.error('[WS] Connection error:', error);
logger.error('[Sync] Failed to sync:', error);
```

### Why Socket Logs are Disabled by Default

WebSocket logs sering menyebabkan **terminal corruption** karena:
- Emit setiap beberapa detik
- Mengandung binary data/ANSI codes
- Reconnection logs yang berulang

Untuk enable socket logging (hanya untuk debugging serius):
```bash
# Di .env
EXPO_DEBUG_SOCKET=true
```

### Testing the Fix

1. **Bersihkan cache dan restart:**
   ```bash
   cd /Users/rohadimraja/Documents/mobile-netmanager
   npm run start:clean
   ```

2. **Terminal output sekarang akan:**
   - ✅ Rapi dan terorganisir
   - ✅ Tidak ada karakter aneh/bahasa berubah
   - ✅ QR code tampil dengan jelas
   - ✅ Logs grouped by category dengan emoji
   - ✅ Tidak ada ANSI color codes di React Native

3. **Jika ingin QUIET mode (tanpa logs):**
   ```bash
   # Edit .env
   EXPO_DEBUG=false
   ```

### Best Practices

1. **Gunakan logger yang tepat:**
   - `logger.auth()` untuk authentication flow
   - `logger.socket()` untuk WebSocket (disabled by default)
   - `logger.sync()` untuk sync/offline operations
   - `logger.db()` untuk database operations
   - `logger.error()` untuk errors (selalu tampil)

2. **Jangan gunakan console.log lagi** - ganti semua dengan logger

3. **Object/Array logging otomatis di-stringify:**
   ```typescript
   const data = { user: 'john', role: 'admin' };
   logger.log('Data:', data);  // Otomatis JSON.stringify
   ```

4. **NEVER enable EXPO_USE_COLORS di React Native** - akan menyebabkan terminal corruption!

### Troubleshooting

**Masalah: Error "Cannot read property 'isTTY' of undefined"**
```bash
# Pastikan .env sudah ter-update dengan:
EXPO_USE_COLORS=false
# Lalu restart:
npm run start:clean
```

**Masalah: Terminal masih berantakan**
```bash
# Kill semua process dan clear cache
pkill -f expo
rm -rf node_modules/.cache
npm run start:clean
```

**Masalah: QR code tidak muncul**
```bash
# Cek apakah ada process lain di port 8081
lsof -i :8081
kill -9 <PID>
npm start
```

**Masalah: Tidak ada logs sama sekali**
```bash
# Pastikan EXPO_DEBUG=true di .env
# Atau temporary:
export EXPO_DEBUG=true
npm start
```

### Next Steps

Untuk mengganti sisa console.log di file lain (opsional):
```bash
# Cari semua console.log yang belum diganti
grep -r "console\." app/ --include="*.tsx" --include="*.ts"
```

File yang perlu di-update (opsional, tidak critical):
- services/SyncService.ts
- services/DatabaseService.ts
- services/PushNotificationService.ts
- hooks/useOfflineMutation.ts
- hooks/useOfflineQuery.ts
- components/molecules/NotificationBell.tsx

## Summary

✅ **Terminal corruption FIXED** dengan logger utility
✅ **process.stdout crash FIXED** - works di React Native
✅ **QR code now visible** dengan proper Metro config
✅ **Clean output** dengan environment-based logging
✅ **Easy debugging** dengan category-based logs
✅ **Production-ready** dengan auto-disable di production
✅ **NO ANSI colors** di React Native untuk avoid corruption

Happy coding! 🚀
