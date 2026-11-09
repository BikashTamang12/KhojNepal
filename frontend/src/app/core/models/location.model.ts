export interface Location {
  id: string;
  province: string;
  district: string;
  municipality: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
}

export interface QueryLocationParams {
  province?: string;
  district?: string;
  municipality?: string;
  q?: string;
}

export interface CreateLocationRequest {
  province: string;
  district: string;
  municipality: string;
  area?: string;
  latitude?: number;
  longitude?: number;
}

export function formatLocationLabel(location?: Location | null): string {
  if (!location) {
    return 'Unknown location';
  }
  const parts = [location.area, location.municipality, location.district].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(', ') : location.province;
}
