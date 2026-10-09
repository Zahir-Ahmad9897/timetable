import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateCapacity } from '../capacity';
import { sampleWorkspace } from '../defaults';

describe('weekly capacity', () => {
  it('separates lecture and lab demand', () => { const rows = calculateCapacity(sampleWorkspace()); assert.equal(rows.find((row) => row.type === 'lecture')?.required, 3); assert.equal(rows.find((row) => row.type === 'lab')?.required, 3); });
  it('reports a shortage when no compatible lab exists', () => { const workspace = sampleWorkspace(); workspace.rooms = workspace.rooms.filter((room) => room.type !== 'lab'); assert.ok(calculateCapacity(workspace).find((row) => row.type === 'lab')!.shortage > 0); });
});
