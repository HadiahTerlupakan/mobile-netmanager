export function normalizeWorkOrderRouteParam(
  routeParam: string | string[] | undefined,
): string | null {
  const firstValue = Array.isArray(routeParam) ? routeParam[0] : routeParam;
  const normalizedValue = firstValue?.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

export function resolveCanonicalWorkOrderId(
  routeWorkOrderId: string | null,
  detailWorkOrderId: string | null | undefined,
): string | null {
  if (detailWorkOrderId?.trim()) {
    return detailWorkOrderId.trim();
  }

  return routeWorkOrderId;
}
