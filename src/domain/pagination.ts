export interface PageResult<T> { items: T[]; page: number; pageCount: number; total: number }

export function paginateRecords<T>(records: T[], query: string, searchText: (record: T) => string, requestedPage: number, pageSize: number): PageResult<T> {
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = normalized ? records.filter((record) => searchText(record).toLocaleLowerCase().includes(normalized)) : records;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pageCount));
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageCount, total: filtered.length };
}
