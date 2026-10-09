import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { paginateRecords } from '../pagination';

describe('resource pagination', () => {
  const rows = Array.from({ length: 23 }, (_, index) => ({ id: index + 1, name: index === 12 ? 'Computer Networks' : `Course ${index + 1}` }));

  it('returns a fixed page and correct totals', () => {
    const result = paginateRecords(rows, '', (row) => row.name, 2, 10);
    assert.equal(result.page, 2);
    assert.equal(result.pageCount, 3);
    assert.equal(result.total, 23);
    assert.deepEqual(result.items.map((row) => row.id), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('searches case-insensitively and clamps an invalid page', () => {
    const result = paginateRecords(rows, 'NETWORKS', (row) => row.name, 9, 10);
    assert.equal(result.page, 1);
    assert.equal(result.pageCount, 1);
    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.id, 13);
  });

  it('represents an empty result as page one of one', () => {
    const result = paginateRecords(rows, 'not present', (row) => row.name, 2, 10);
    assert.equal(result.page, 1);
    assert.equal(result.pageCount, 1);
    assert.equal(result.total, 0);
    assert.deepEqual(result.items, []);
  });
});
