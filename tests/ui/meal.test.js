// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, memoryStorage } from './helpers.js';

const chips = (t) => t.$$('.part-chip').map((c) => `${c.classList.contains('active') ? '*' : ''}${c.querySelector('.part-name').textContent} ${c.querySelector('.part-amount').textContent}`);
const addPart = (t) => t.plate().querySelector('.part-add').click();
const chip = (t, name) => t.$$('.part-chip').find((c) => c.querySelector('.part-name').textContent === name);
const logBtn = (t) => t.plate().querySelector('.log');

// Rice 2, Chicken 3, Salad 1, built with + Part and named in each part's dialog.
function buildDinner(t) {
  const name = (n) => {
    t.$('.part-chip.active').click();
    const dlg = t.$('dialog.part-editor');
    t.type(dlg.querySelector('#part-label'), n);
    t.button('Save', dlg).click();
  };
  t.quick('2').click();
  name('Rice');
  addPart(t);
  t.quick('3').click();
  name('Chicken');
  addPart(t);
  t.quick('1').click();
  name('Salad');
}
const logDinner = (t, label = 'Dinner') => {
  buildDinner(t);
  t.type('#label', label);
  logBtn(t).click();
};

describe('Building a meal on the plate', () => {
  it('+ Part starts a new section, and quick amounts go to the selected one', () => {
    const t = mount();
    t.quick('1').click();
    expect(chips(t)).toEqual(['*Part 1 1']);
    addPart(t);
    expect(chips(t)).toEqual(['Part 1 1', '*Part 2 0']);
    t.quick('2').click();
    t.quick('½').click();
    expect(chips(t)).toEqual(['Part 1 1', '*Part 2 2½']);
    chip(t, 'Part 1').click();
    t.quick('½').click();
    expect(chips(t)).toEqual(['*Part 1 1½', 'Part 2 2½']);
    expect(t.$('.part-chip.active').getAttribute('aria-pressed')).toBe('true');
    expect(t.plate().querySelector('.plate-sum').textContent).toBe('1½ + 2½ = 4');
  });

  it('a recent chip adds a part named after it', () => {
    const t = mount();
    t.type('#label', 'Latte');
    t.logNow('1');
    t.quick('2').click();
    t.$('.recents button').click();
    expect(chips(t)).toEqual(['Part 1 2', '*Latte 1']);
  });

  it('asks for a meal name once there are several parts', () => {
    const t = mount();
    t.quick('1').click();
    expect(t.$('#label').placeholder).toBe('What was it? (optional)');
    addPart(t);
    expect(t.$('#label').placeholder).toBe('Name this meal (optional)');
    expect(t.$('label[for="label"]').textContent).toBe('Name this meal (optional)');
  });

  it('tapping the selected part opens it to rename, change or remove', () => {
    const t = mount();
    buildDinner(t);
    expect(chips(t)).toEqual(['Rice 2', 'Chicken 3', '*Salad 1']);
    t.$('.part-chip.active').click();
    const dlg = t.$('dialog.part-editor');
    expect(dlg.querySelector('#part-label').value).toBe('Salad');
    expect(dlg.querySelector('.stepper output').textContent).toBe('1');
    dlg.querySelector('.stepper .plus').click();
    t.button('Save', dlg).click();
    expect(chips(t)).toEqual(['Rice 2', 'Chicken 3', '*Salad 1½']);
    chip(t, 'Chicken').click();
    chip(t, 'Chicken').click();
    t.button('Remove', t.$('dialog.part-editor')).click();
    expect(chips(t)).toEqual(['*Rice 2', 'Salad 1½']);
  });

  it('↶ takes off the last amount of the selected part', () => {
    const t = mount();
    buildDinner(t);
    chip(t, 'Rice').click();
    t.quick('1').click();
    t.plate().querySelector('[aria-label="Remove last"]').click();
    expect(chips(t)).toEqual(['*Rice 2', 'Chicken 3', 'Salad 1']);
    t.plate().querySelector('[aria-label="Remove last"]').click();
    expect(chips(t)).toEqual(['*Chicken 3', 'Salad 1']);
  });

  it('holds up to 8 parts', () => {
    const t = mount();
    for (let i = 0; i < 8; i++) {
      t.quick('1').click();
      if (i < 7) addPart(t);
    }
    expect(t.plate().querySelector('.part-add').disabled).toBe(true);
    t.type('#label', 'Snack');
    t.logNow('1');
    for (let i = 0; i < 9; i++) t.app.actions.addPart(1, `P${i}`);
    expect(t.toast().textContent).toBe('A meal holds up to 8 parts.');
  });

  it('draws a wedge per part, and tapping a wedge selects that part', () => {
    const t = mount();
    t.quick('2').click();
    expect(t.$$('.plate-art .wedge')).toHaveLength(1);
    expect(t.$$('.plate-art .wedge-label')).toHaveLength(0);
    expect(t.$('.plate-art .wedge.active')).toBeNull(); // nothing to pick between
    buildDinner(t);
    expect(t.$$('.plate-art .wedge')).toHaveLength(3);
    expect(t.$$('.plate-art .wedge-label').map((l) => l.textContent)).toEqual(['RICE', 'CHICKEN', 'SALAD']);
    expect(t.$('.plate-art .wedge.active').dataset.part).toBe('2');
    t.$('.plate-art .wedge[data-part="0"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(chips(t)[0]).toBe('*Rice 4');
    expect(t.$$('.plate-art .piece').every((p) => p.dataset.part != null)).toBe(true);
  });

  it('draws part names as text', () => {
    const t = mount();
    t.quick('1').click();
    t.app.actions.addPart(1, '<img src=x onerror=alert(1)>');
    expect(t.$('.plate img')).toBeNull();
    expect(t.$('.wedge-label:last-of-type').textContent).toBe('<IMG SRC=X ON…');
  });

  it('keeps the parts when the app closes', () => {
    const storage = memoryStorage();
    buildDinner(mount({ storage }));
    expect(chips(mount({ storage }))).toEqual(['Rice 2', 'Chicken 3', '*Salad 1']);
  });
});

describe('Logging a meal', () => {
  it('logs one entry per part, grouped as a meal under the typed name', () => {
    const t = mount();
    logDinner(t);
    expect(t.entries()).toEqual([['Dinner', '6']]);
    expect(t.$('.entries .meal .parts').textContent).toBe('Rice 2 · Chicken 3 · Salad 1');
    expect(t.total()).toBe('6');
    const es = t.app.state().entries;
    expect(es.map((e) => [e.label, e.halves])).toEqual([['Rice', 4], ['Chicken', 6], ['Salad', 2]]);
    expect(new Set(es.map((e) => e.meal.id)).size).toBe(1);
    expect(es[0].meal.name).toBe('Dinner');
    expect(t.plate()).toBeNull();
    expect(t.$('#label').value).toBe('');
    expect(t.toast().textContent).toMatch(/Logged 6 · Dinner/);
  });

  it('undo takes the whole meal back off the log', () => {
    const t = mount();
    logDinner(t);
    t.button('Undo', t.toast()).click();
    expect(t.entries()).toEqual([]);
    expect(t.app.state().entries.every((e) => e.deleted)).toBe(true);
  });

  it('calls an unnamed meal "Meal", and skips empty parts', () => {
    const t = mount();
    t.quick('1').click();
    addPart(t);
    t.quick('2').click();
    addPart(t);
    logBtn(t).click();
    expect(t.entries()).toEqual([['Meal', '3']]);
    expect(t.$('.entries .meal .parts').textContent).toBe('Food 1 · Food 2');
    expect(t.app.state().entries).toHaveLength(2);
  });

  it('a plate with one part still logs a plain entry', () => {
    const t = mount();
    t.quick('1').click();
    addPart(t);
    logBtn(t).click();
    expect(t.$('.entries .meal')).toBeNull();
    expect(t.app.state().entries[0].meal).toBeUndefined();
  });

  it('counts a meal as one entry in History', () => {
    const t = mount();
    logDinner(t);
    t.tab('history');
    expect(t.$('.days .count').textContent).toBe('1 entry');
  });
});

describe('Meals in the log', () => {
  const open = (t) => {
    t.$('.entries .meal').click();
    return t.$('dialog.meal-editor');
  };
  const partRows = (dlg) => [...dlg.querySelectorAll('.meal-part')].map((r) => `${r.querySelector('input').value} ${r.querySelector('output').textContent}`);

  it('tapping a meal opens it with its name, parts and day', () => {
    const t = mount();
    logDinner(t);
    const dlg = open(t);
    expect(dlg.querySelector('#meal-name').value).toBe('Dinner');
    expect(partRows(dlg)).toEqual(['Rice 2', 'Chicken 3', 'Salad 1']);
    expect(dlg.querySelector('#meal-day').value).toBe('2026-11-03');
  });

  it('renames the meal, changes and renames parts, and removes one', () => {
    const t = mount();
    logDinner(t);
    const dlg = open(t);
    t.type('#meal-name', 'Supper');
    const [rice, chicken, salad] = dlg.querySelectorAll('.meal-part');
    t.type(rice.querySelector('input'), 'Brown rice');
    chicken.querySelector('.plus').click();
    salad.querySelector('.part-remove').click();
    expect(partRows(dlg)).toEqual(['Brown rice 2', 'Chicken 3½']);
    t.button('Save', dlg).click();
    expect(t.entries()).toEqual([['Supper', '5½']]);
    expect(t.$('.entries .meal .parts').textContent).toBe('Brown rice 2 · Chicken 3½');
    expect(t.app.state().entries.filter((e) => !e.deleted).every((e) => e.meal.name === 'Supper')).toBe(true);
    expect(t.app.state().entries.find((e) => e.label === 'Salad').deleted).toBe(true);
  });

  it('won’t remove the last part (that’s Delete meal)', () => {
    const t = mount();
    logDinner(t);
    const dlg = open(t);
    const removes = () => [...dlg.querySelectorAll('.part-remove')];
    removes()[0].click();
    removes()[0].click();
    expect(removes()[0].disabled).toBe(true);
  });

  it('moves the whole meal to another day', () => {
    const t = mount();
    logDinner(t);
    const dlg = open(t);
    t.change(dlg.querySelector('#meal-day'), '2026-11-01');
    t.button('Save', dlg).click();
    expect(t.entries()).toEqual([]);
    expect(t.app.state().entries.map((e) => e.day)).toEqual(['2026-11-01', '2026-11-01', '2026-11-01']);
  });

  it('cancel changes nothing', () => {
    const t = mount();
    logDinner(t);
    const dlg = open(t);
    t.type('#meal-name', 'Nope');
    dlg.querySelector('.part-remove').click();
    t.button('Cancel', dlg).click();
    expect(t.entries()).toEqual([['Dinner', '6']]);
  });

  it('Delete meal deletes every part, with undo', () => {
    const t = mount();
    logDinner(t);
    t.button('Delete meal', open(t)).click();
    expect(t.entries()).toEqual([]);
    expect(t.toast().textContent).toMatch(/Deleted/);
    t.button('Undo', t.toast()).click();
    expect(t.entries()).toEqual([['Dinner', '6']]);
  });

  it('renders meal and part names as text', () => {
    const t = mount();
    const nasty = '<img src=x onerror=alert(1)>';
    t.quick('1').click();
    t.app.actions.addPart(1, nasty);
    t.type('#label', nasty);
    logBtn(t).click();
    expect(t.$('.entries img')).toBeNull();
    expect(t.entries()[0][0]).toBe(nasty);
    open(t);
    expect(t.$('dialog img')).toBeNull();
  });
});

describe('Swiping a meal', () => {
  const pointer = (el, type, x) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: 100, bubbles: true, pointerId: 1, button: 0 }));
  const swipe = (row, dx) => {
    pointer(row, 'pointerdown', 200);
    pointer(row, 'pointermove', 200 + dx / 2);
    pointer(row, 'pointermove', 200 + dx);
    pointer(row, 'pointerup', 200 + dx);
    row.click();
  };

  it('left deletes the whole meal, with undo', () => {
    const t = mount();
    logDinner(t);
    swipe(t.$('.entries .meal'), -200);
    expect(t.entries()).toEqual([]);
    expect(t.$('dialog')).toBeNull();
    t.button('Undo', t.toast()).click();
    expect(t.entries()).toEqual([['Dinner', '6']]);
  });

  it('right puts the whole meal back on the plate, name and all, without logging it', () => {
    const t = mount();
    logDinner(t);
    swipe(t.$('.entries .meal'), 200);
    expect(chips(t)).toEqual(['Rice 2', 'Chicken 3', '*Salad 1']);
    expect(t.$('#label').value).toBe('Dinner');
    expect(t.app.state().entries).toHaveLength(3);
  });

  it('right keeps a name you’ve already typed', () => {
    const t = mount();
    logDinner(t);
    t.type('#label', 'Second dinner');
    swipe(t.$('.entries .meal'), 200);
    expect(t.$('#label').value).toBe('Second dinner');
  });
});
