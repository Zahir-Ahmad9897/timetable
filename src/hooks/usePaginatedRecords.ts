import { useEffect, useMemo, useState } from 'react';
import { paginateRecords } from '../domain/pagination';

export function usePaginatedRecords<T>(records: T[], searchText: (record: T) => string, pageSize = 10) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const normalized = query.trim().toLocaleLowerCase();
  const result = useMemo(() => paginateRecords(records, normalized, searchText, page, pageSize), [records, normalized, searchText, page, pageSize]);

  useEffect(() => { setPage(1); }, [normalized, records.length]);
  useEffect(() => { if (page !== result.page) setPage(result.page); }, [page, result.page]);

  return { query, setQuery, page: result.page, setPage, pageCount: result.pageCount, items: result.items, total: result.total };
}
