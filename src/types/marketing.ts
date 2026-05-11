export interface CanvasingWorkOrder {
    id: string;
    workOrderNumber: string;
    status: string;
}

export interface CanvasingClaim {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNotes?: string;
    buktiUrls?: string[];
    createdAt: string;
}

export interface Canvasing {
    id: string;
    nama: string;
    noKtp: string;
    noTelpon: string;
    email?: string;
    alamat: string;
    kabel: number;
    odp: string;
    paket: string;
    sn: string;
    shareloc?: string;
    latitude?: number;
    longitude?: number;
    status: string;
    foto?: string;
    fotoKtp?: string;
    isLocked: boolean;
    createdAt: string;
    workOrder?: CanvasingWorkOrder;
    pointClaims?: CanvasingClaim;
}

export interface CanvasingClaimResponse {
    claim: CanvasingClaim | null;
}
