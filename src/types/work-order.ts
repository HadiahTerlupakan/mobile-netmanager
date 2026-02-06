export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type WorkOrderType = 'INSTALLATION' | 'MAINTENANCE' | 'DISCONNECTION' | 'RELOCATION' | 'OTHER';

export interface UserSummary {
  id: string;
  name: string | null;
  role?: {
    name: string;
  };
  site?: {
    name: string;
  };
}

export interface WorkOrderTask {
  id: string;
  title: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface WorkOrderAssignment {
  id: string;
  userId: string;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  user: UserSummary;
}

export interface WorkOrderUpdate {
  id: string;
  updateType: 'STATUS_CHANGE' | 'COMMENT' | 'NOTE' | 'PHOTO' | 'MATERIAL_PICKUP' | 'MATERIAL_RETURN' | 'ASSIGNMENT' | 'PARTNER_RESPONSE';
  message: string;
  newStatus?: string;
  createdAt: string;
  filePath?: string;
  user?: UserSummary;
  createdBy?: UserSummary;
}

export interface WorkOrderAttachment {
  id: string;
  filePath: string;
  caption: string | null;
  uploadedAt: string;
  user: UserSummary;
}

export interface UsedMaterial {
  id: string;
  name?: string;
  barangName?: string;
  nama?: string;
  quantity: number;
  jumlah?: number;
  unit?: string;
  satuan?: string;
  kondisi?: 'BARU' | 'BEKAS' | 'RUSAK';
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  locationAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  assignedToId: string | null;
  assignedTo: UserSummary | null;
  tasks: WorkOrderTask[];
  assignments: WorkOrderAssignment[];
  updates: WorkOrderUpdate[];
  attachments: WorkOrderAttachment[];
  usedMaterials: UsedMaterial[];
  returnedMaterials: UsedMaterial[];
  pelanggan?: {
    nama?: string;
    noTelp?: string;
    alamat?: string;
  };
}
