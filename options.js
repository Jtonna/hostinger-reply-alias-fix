(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const pick = $('pick');
  const input = $('email');
  const clean = (s) => (s || '').trim().toLowerCase();

  function fillList(identities, current) {
    pick.textContent = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = "(Hostinger's default)";
    pick.appendChild(none);
    identities.forEach((i) => {
      const o = document.createElement('option');
      o.value = i.email;
      o.textContent = i.name ? i.name + ' <' + i.email + '>' : i.email;
      pick.appendChild(o);
    });
    pick.value = identities.some((i) => i.email === current) ? current : '';
    $('pick-wrap').hidden = identities.length === 0;
    $('empty-hint').hidden = identities.length !== 0;
  }

  pick.addEventListener('change', () => { input.value = pick.value; });
  input.addEventListener('input', () => {
    const v = clean(input.value);
    pick.value = [...pick.options].some((o) => o.value === v) ? v : '';
  });

  $('save').addEventListener('click', () => {
    const value = clean(input.value);
    chrome.storage.sync.set({ defaultSenderEmail: value }, () => {
      input.value = value;
      const s = $('status');
      s.classList.add('show');
      setTimeout(() => s.classList.remove('show'), 1800);
    });
  });

  chrome.storage.sync.get('defaultSenderEmail', (a) => {
    chrome.storage.local.get('knownIdentities', (b) => {
      const current = clean(a.defaultSenderEmail);
      const list = Array.isArray(b.knownIdentities) ? b.knownIdentities : [];
      input.value = current;
      fillList(list, current);
    });
  });
})();
