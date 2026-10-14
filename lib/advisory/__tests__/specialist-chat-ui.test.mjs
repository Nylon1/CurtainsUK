import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../../../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-specialist-chat.js', import.meta.url), 'utf8');

test('switching advisers clears another role’s recovery code, consent and unsent question', () => {
  const handlers = new Map();
  const element = () => ({ hidden: false, disabled: false, value: '', textContent: '',
    addEventListener() {}, focus() {}, replaceChildren() {},
  });
  const controls = Object.fromEntries([
    'heading', 'opening', 'examples', 'consent', 'signin', 'start', 'save', 'delete',
    'delete-confirm', 'delete-yes', 'delete-cancel', 'log', 'form', 'input', 'send',
    'recovery', 'recovery-input', 'recover', 'recovery-output', 'status', 'error',
  ].map(name => [name, element()]));
  const consentLabel = element();
  controls.consent.checked = false;
  controls.consent.closest = () => consentLabel;
  const panel = { dataset: { specialistPublic: 'false' }, hidden: false,
    querySelector: selector => controls[selector.slice('[data-specialist-'.length, -1)],
  };
  const dialog = {
    querySelector: selector => selector === '[data-specialist-chat]' ? panel : null,
    addEventListener: (name, callback) => handlers.set(name, callback),
  };
  runInNewContext(script, {
    document: { querySelectorAll: () => [dialog], addEventListener() {}, hidden: false },
    window: { addEventListener() {} },
    location: { origin: 'https://www.curtainsuk.com' },
    localStorage: { getItem: () => null },
    fetch: async () => ({ ok: false, status: 401, json: async () => ({}) }),
    URL, URLSearchParams, Object,
  });

  controls['recovery-output'].textContent = 'prior role one-use recovery code';
  controls['recovery-output'].hidden = false;
  controls['recovery-input'].value = 'prior role code';
  controls.input.value = 'prior role unsent question';
  controls.consent.checked = true;
  controls['delete-confirm'].hidden = false;

  handlers.get('curtainsuk:jane-room-open')({ detail: { identity: 'ben' } });

  assert.equal(controls.heading.textContent, 'Ben · AI acoustic adviser');
  assert.equal(controls['recovery-output'].textContent, '');
  assert.equal(controls['recovery-output'].hidden, true);
  assert.equal(controls['recovery-input'].value, '');
  assert.equal(controls.input.value, '');
  assert.equal(controls.consent.checked, false);
  assert.equal(controls['delete-confirm'].hidden, true);
});
