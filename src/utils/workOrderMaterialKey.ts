import type { UsedMaterial } from '@/types/work-order';

type MaterialKeySection = 'used' | 'returned';

type WorkOrderMaterialKeyInput = UsedMaterial & {
  barangId?: string;
  gudangId?: string;
};

const getMaterialLabel = (item: WorkOrderMaterialKeyInput) => {
  return item.name || item.barangName || item.nama || 'material';
};

const getMaterialQuantity = (item: WorkOrderMaterialKeyInput) => {
  return item.quantity || item.jumlah || 0;
};

const getFallbackMaterialIdentity = (item: WorkOrderMaterialKeyInput) => {
  const identityParts = [item.barangId, item.gudangId, item.kondisi].filter(Boolean);

  if (identityParts.length > 0) {
    return identityParts.join('-');
  }

  return `${getMaterialLabel(item)}-${getMaterialQuantity(item)}`;
};

export function buildWorkOrderMaterialKey(
  item: WorkOrderMaterialKeyInput,
  index: number,
  section: MaterialKeySection,
) {
  if (item.id) {
    return `${section}-${item.id}`;
  }

  return `${section}-${getFallbackMaterialIdentity(item)}-${index}`;
}
