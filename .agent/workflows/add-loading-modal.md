---
description: Panduan menambahkan Loading Animation pada screen mobile app
---

# Add Loading Animation

Workflow ini menjelaskan cara menambahkan indikator loading standard (`LoadingModal`) pada screen di `mobile-netmanager`.

## 1. Import Component

Pastikan import component `LoadingModal` dan `useState`.

```tsx
import LoadingModal from "@/components/LoadingModal";
import { useState } from "react";
```

## 2. Tambahkan State

Tambahkan state untuk visibilitas dan pesan loading di dalam component.

```tsx
// Loading state
const [loadingMessage, setLoadingMessage] = useState("");
const [showLoading, setShowLoading] = useState(false);
```

## 3. Implementasi UI

Tambahkan `<LoadingModal />` di bagian bawah render, biasanya sebelum tag penutup `</View>` utama atau di luar `ScrollView` jika ada.

```tsx
return (
  <View style={tw`flex-1`}>
    {/* Content lainnya... */}

    <LoadingModal visible={showLoading} message={loadingMessage} />
  </View>
);
```

## 4. Implementasi Logic

Update fungsi `handleSubmit` atau proses async lainnya untuk mengontrol state loading. Gunakan pesan yang informatif (e.g., "Memproses...", "Mengupload...", "Menyimpan...").

```tsx
const handleSubmit = async () => {
  // Validasi...

  // Start Loading
  setShowLoading(true);
  setLoadingMessage("Memproses data...");

  try {
    // Contoh: Upload Foto
    if (hasPhotos) {
      setLoadingMessage("Mengupload foto...");
      await uploadPhotos();
    }

    // Contoh: Simpan Data
    setLoadingMessage("Menyimpan data...");
    await mutate(
      { ...data },
      {
        onSuccess: () => {
          setShowLoading(false); // Stop Loading
          // Redirect or Reset
        },
        onError: (err) => {
          setShowLoading(false); // Stop Loading
          Alert.alert("Error", err.message);
        },
      }
    );
  } catch (error) {
    setShowLoading(false); // Stop Loading on Catch
    Alert.alert("Error", "Terjadi kesalahan");
  }
};
```

## 5. Offline Handling (Optional)

Jika mendukung offline mode dengan `SyncService`, sesuaikan pesan loading.

```tsx
setLoadingMessage("Menyimpan ke antrian offline...");
// ... logic simpan ke local queue
```
