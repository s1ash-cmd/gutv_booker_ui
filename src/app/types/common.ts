export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  sortBy: string;
  sortDirection: SortDirection;
}
