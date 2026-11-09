import { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | number | null): number | null | undefined => {
    if (value === null || value === undefined) {
      return value;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  },
};
