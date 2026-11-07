import { describe, it, expect } from 'vitest';
import {
  EMPTY_PLATE, MAX_PARTS, plateTotal, partHalves, addAmount, addPart, newPart, selectPart, undoPlate, removePart,
  updatePart, formatPlate, filledParts, partName, sanitizePlate, platePieces,
} from '../../src/lib/plate.js';

// A plate from parts written as [amounts, label?]; the last part is active unless given.
const plate = (parts, active = parts.length - 1) => ({
  parts: parts.map(([amounts, label], i) => (label ? { id: i + 1, label, amounts } : { id: i + 1, amounts })),
  active: Math.max(0, active),
});
const view = (p) => p.parts.map((x, i) => `${i === p.active ? '*' : ''}${x.label ?? '-'}:${x.amounts.join(',')}`).join(' ');

describe('plate parts', () => {
  it('adds up', () => {
    expect(plateTotal(EMPTY_PLATE)).toBe(0);
    expect(plateTotal(plate([[[2, 1]], [[4], 'Rice']]))).toBe(7);
    expect(partHalves({ amounts: [2, 1] })).toBe(3);
  });

  it('a quick amount goes into the part being built, starting one if the plate is empty', () => {
    const one = addAmount(EMPTY_PLATE, 2);
    expect(one).toEqual({ parts: [{ id: 1, amounts: [2] }], active: 0 });
    expect(view(addAmount(one, 1))).toBe('*-:2,1');
    expect(view(addAmount(selectPart(plate([[[2], 'Rice'], [[4], 'Fish']]), 0), 1))).toBe('*Rice:2,1 Fish:4');
    expect(EMPTY_PLATE).toEqual({ parts: [], active: 0 });
  });

  it('a named amount (a chip, Look up, Again) starts its own part and makes it the one being built', () => {
    const p = addPart(addAmount(EMPTY_PLATE, 2), 5, '  Bagel (regular) ');
    expect(view(p)).toBe('-:2 *Bagel (regular):5');
    expect(p.parts[1].id).toBe(2);
    expect(view(addPart(EMPTY_PLATE, 3, ''))).toBe('*-:3');
  });

  it('fills an empty, unnamed part instead of starting another', () => {
    const p = newPart(plate([[[2], 'Rice']]));
    expect(view(p)).toBe('Rice:2 *-:');
    expect(view(addPart(p, 4, 'Fish'))).toBe('Rice:2 *Fish:4');
    expect(view(addAmount(p, 1))).toBe('Rice:2 *-:1');
  });

  it('+ Part starts an empty part, or picks the empty one already there', () => {
    const p = newPart(plate([[[2], 'Rice'], [[]], [[3], 'Fish']]));
    expect(p.active).toBe(1);
    expect(p.parts).toHaveLength(3);
  });

  it('holds up to 100 bananas and 8 parts', () => {
    expect(addAmount(plate([[[196]]]), 4)).not.toBeNull();
    expect(addAmount(plate([[[196]]]), 6)).toBeNull();
    expect(addPart(plate([[[196]]]), 6, 'Pie')).toBeNull();
    const full = plate(Array.from({ length: MAX_PARTS }, (_, i) => [[1], `P${i}`]));
    expect(MAX_PARTS).toBe(8);
    expect(addPart(full, 1, 'More')).toBeNull();
    expect(newPart(full)).toBeNull();
    expect(addAmount(full, 1)).not.toBeNull();
  });

  it('switches the part being built', () => {
    const p = plate([[[2], 'Rice'], [[4], 'Fish']]);
    expect(selectPart(p, 0).active).toBe(0);
    expect(selectPart(p, 5)).toBe(p);
  });

  it('↶ takes the last amount off the part being built, and the part once it’s empty', () => {
    const p = plate([[[2], 'Rice'], [[4, 1], 'Fish']]);
    expect(view(undoPlate(p))).toBe('Rice:2 *Fish:4');
    expect(view(undoPlate(undoPlate(p)))).toBe('*Rice:2');
    expect(view(undoPlate(newPart(p)))).toBe('Rice:2 *Fish:4,1');
    expect(undoPlate(plate([[[2]]]))).toEqual(EMPTY_PLATE);
    expect(undoPlate(EMPTY_PLATE)).toEqual(EMPTY_PLATE);
  });

  it('removes a part, keeping the one being built when it can', () => {
    const p = plate([[[2], 'A'], [[4], 'B'], [[1], 'C']], 2);
    expect(view(removePart(p, 0))).toBe('B:4 *C:1');
    expect(view(removePart(p, 2))).toBe('A:2 *B:4');
    expect(view(removePart(selectPart(p, 0), 0))).toBe('*B:4 C:1');
  });

  it('edits a part’s amount and name, keeping its taps when the amount is unchanged', () => {
    const p = plate([[[2, 1], 'Rice'], [[4], 'Fish']]);
    expect(updatePart(p, 0, { label: 'Brown rice', halves: 3 }).parts[0]).toEqual({ id: 1, label: 'Brown rice', amounts: [2, 1] });
    expect(updatePart(p, 0, { halves: 6 }).parts[0]).toEqual({ id: 1, label: 'Rice', amounts: [6] });
    expect(updatePart(p, 1, { label: ' ' }).parts[1]).toEqual({ id: 2, amounts: [4] });
    expect(updatePart(p, 1, { halves: 0 }).parts[1]).toEqual({ id: 2, label: 'Fish', amounts: [] });
    expect(updatePart(p, 1, { halves: 200 })).toBeNull();
  });

  it('names parts for the chips', () => {
    expect(partName({ label: 'Rice', amounts: [] }, 0)).toBe('Rice');
    expect(partName({ amounts: [2] }, 2)).toBe('Part 3');
  });

  it('lists what to log: parts with something in them', () => {
    expect(filledParts(plate([[[2, 1], 'Rice'], [[]], [[4]]]))).toEqual([{ halves: 3, label: 'Rice' }, { halves: 4, label: '' }]);
  });

  it('shows the sum: the taps of a lone part, or each part’s total', () => {
    expect(formatPlate(EMPTY_PLATE)).toBe('');
    expect(formatPlate(plate([[[3]]]))).toBe('1½');
    expect(formatPlate(plate([[[2, 4, 1]]]))).toBe('1 + 2 + ½ = 3½');
    expect(formatPlate(plate([[[2, 2, 2, 2, 2, 2, 2]]]))).toBe('… + 1 + 1 + 1 = 7');
    expect(formatPlate(plate([[[2, 2], 'Rice'], [[6], 'Fish'], [[]]]))).toBe('2 + 3 = 5');
    expect(formatPlate(plate([[[2, 2], 'Rice'], [[]]]))).toBe('1 + 1 = 2');
  });

  it('reads back a stored plate, dropping anything invalid', () => {
    expect(sanitizePlate({
      parts: [{ id: 3, label: 'Rice', amounts: [2, 0, 2.5, 4] }, null, { id: 3, label: 7, amounts: [1] }, { amounts: 'x' }, { id: 9, amounts: [] }],
      active: 2,
    })).toEqual({ parts: [{ id: 3, label: 'Rice', amounts: [2, 4] }, { id: 4, amounts: [1] }, { id: 9, amounts: [] }], active: 2 });
    expect(sanitizePlate({ parts: [{ id: 1, amounts: [2] }], active: 4 }).active).toBe(0);
    expect(sanitizePlate('nope')).toEqual(EMPTY_PLATE);
    expect(sanitizePlate({ parts: [{ id: 1, amounts: [150] }, { id: 2, amounts: [150] }] }).parts[1].amounts).toEqual([]);
    expect(sanitizePlate({ parts: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, amounts: [1] })) }).parts).toHaveLength(8);
  });

  it('turns a plate saved before parts existed into one part, as it would have been logged', () => {
    expect(sanitizePlate([{ halves: 2 }, { halves: 3, label: 'Latte' }, { halves: 0 }, { halves: 1, label: 'latte' }, { halves: 2, label: 'Bun' }]))
      .toEqual({ parts: [{ id: 1, label: 'Latte + Bun', amounts: [2, 3, 1, 2] }], active: 0 });
    expect(sanitizePlate([])).toEqual(EMPTY_PLATE);
  });

  it('breaks the plate into pieces to draw: a banana per whole one and a cut half per ½, tap by tap, with stable keys', () => {
    expect(platePieces(plate([[[3, 1], 'Rice'], [[4]]]))).toEqual([
      { key: '1.0.0', kind: 'whole', part: 0 }, { key: '1.0.h', kind: 'half', part: 0 }, { key: '1.1.h', kind: 'half', part: 0 },
      { key: '2.0.0', kind: 'whole', part: 1 }, { key: '2.0.1', kind: 'whole', part: 1 },
    ]);
    expect(platePieces(EMPTY_PLATE)).toEqual([]);
  });
});
