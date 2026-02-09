import { z } from 'zod';

/**
 * Sanitizes input string by removing potential XSS characters and trimming whitespace.
 * Useful for user-generated content before sending to API or displaying.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 5000); // Reasonable limit for text fields
}

/**
 * Common Schemas
 */

// Login Schema
export const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid').trim(),
  password: z.string().min(1, 'Password wajib diisi'),
});

// Work Order Update Schema (Notes/Comments)
export const WorkOrderUpdateSchema = z.object({
  notes: z.string().max(2000, 'Catatan maksimal 2000 karakter').optional(),
  action: z.enum(['START', 'PAUSE', 'COMPLETE', 'COMMENT', 'CHECK_IN']),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

// Complete Work Order Schema
export const CompleteWorkOrderSchema = z.object({
  notes: z.string().min(5, 'Catatan minimal 5 karakter').max(2000, 'Catatan maksimal 2000 karakter'),
  action: z.literal('COMPLETE'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

// Canvasing Form Schema
export const CanvasingSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter').max(100).trim(),
  noKtp: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit angka'),
  noTelpon: z.string().min(10, 'Nomor telepon minimal 10 digit').regex(/^\d+$/, 'Nomor telepon hanya boleh angka'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  alamat: z.string().min(5, 'Alamat terlalu pendek').max(500),
  paket: z.string().min(1, 'Paket wajib dipilih'),
  kabel: z.number().min(0, 'Estimasi kabel tidak boleh negatif'),
  odp: z.string().optional(),
  sn: z.string().optional(),
  shareloc: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Leave Request Schema
export const LeaveRequestSchema = z.object({
  type: z.enum(['SAKIT', 'CUTI', 'IZIN', 'TUKAR_LIBUR', 'LAINNYA']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(5, 'Alasan minimal 5 karakter').max(500),
  replacementDate: z.string().datetime().optional(),
});

// Overtime Request Schema
export const OvertimeRequestSchema = z.object({
  date: z.string().datetime(),
  reason: z.string().min(5, 'Alasan minimal 5 karakter').max(500),
});

// Profile Update Schema
export const ProfileSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100).trim(),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit').regex(/^\d+$/, 'Nomor telepon hanya boleh angka'),
});

// Change Password Schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi password minimal 6 karakter'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru dan konfirmasi tidak cocok",
  path: ["confirmPassword"],
});

// Request Work Order Schema
export const RequestWorkOrderSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter').max(100).trim(),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter').trim(),
  notes: z.string().optional(),
});

// Claim Point Schema
export const ClaimPointSchema = z.object({
  keterangan: z.string().max(1000, 'Keterangan maksimal 1000 karakter').optional(),
});

// Inventory Masuk Schema
export const InventoryMasukSchema = z.object({
  barangId: z.string().min(1, 'Barang wajib dipilih'),
  gudangId: z.string().min(1, 'Gudang wajib dipilih'),
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  kondisi: z.enum(['BARU', 'BEKAS', 'RUSAK']),
  keterangan: z.string().max(1000, 'Keterangan maksimal 1000 karakter').optional(),
});

// Inventory Keluar Schema
export const InventoryKeluarSchema = z.object({
  barangId: z.string().min(1, 'Barang wajib dipilih'),
  gudangId: z.string().min(1, 'Gudang wajib dipilih'),
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  kondisi: z.enum(['BARU', 'BEKAS', 'RUSAK']),
  tujuanPenggunaan: z.string().max(500, 'Tujuan penggunaan maksimal 500 karakter').optional(),
  keterangan: z.string().max(1000, 'Keterangan maksimal 1000 karakter').optional(),
});

// Work Order Material Item Schema
export const WorkOrderMaterialItemSchema = z.object({
  barangId: z.string().min(1, 'Barang ID wajib'),
  gudangId: z.string().min(1, 'Gudang ID wajib'),
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  kondisi: z.enum(['BARU', 'BEKAS', 'RUSAK']).optional(), // Optional as per usage in code, defaults usually handled
});

// Work Order Material Batch Schema
export const WorkOrderMaterialBatchSchema = z.object({
  items: z.array(WorkOrderMaterialItemSchema).min(1, 'Minimal satu barang harus dipilih'),
});

// Create Conversation Schema
export const CreateConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1, 'Pilih minimal satu user'),
});

/**
 * Helper to validate data against a schema safely
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((e) => e.message).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Data tidak valid' };
  }
}
