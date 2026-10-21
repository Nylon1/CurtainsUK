/* Reuse the released Browse experience only inside the Making Studio chooser. */
(() => {
  'use strict';
  const token = new URLSearchParams(location.search).get('makingPicker');
  if (parent === window || !/^[a-f0-9-]{36}$/.test(token || '')) return;
  const referrer = new URL(document.referrer || location.href);
  if (referrer.origin !== location.origin) return;
  document.documentElement.classList.add('cuk-making-picker');
  const style = document.createElement('style');
  style.textContent = `.cuk-making-picker .shopify-section-group-header-group,.cuk-making-picker .shopify-section-group-footer-group,.cuk-making-picker .cuk-browse-hero,.cuk-making-picker .cuk-naila-entry,.cuk-making-picker [data-cuk-browse-assistance],.cuk-making-picker #samples,.cuk-making-picker .cuk-browse-sticky{display:none!important}.cuk-making-picker [data-cuk-fabric-browser]{padding:20px 0}.cuk-making-picker [data-cuk-fabric-browser]>.cuk-wrap{display:block!important;max-width:1200px;margin:auto;padding:0 20px}.cuk-making-picker .cuk-fabric-filters,.cuk-making-picker [data-cuk-fabric-grid]{width:100%;grid-column:1/-1}.cuk-making-picker [data-cuk-fabric-grid]{grid-template-columns:repeat(3,minmax(0,1fr))}.cuk-making-picker .cuk-making-picker__select{width:100%;min-height:52px;margin:12px 0 4px;padding:12px 16px;border:0;border-radius:10px;background:#244d3d;color:#fffdf4;font:600 15px Arial,sans-serif;cursor:pointer}.cuk-making-picker .cuk-making-picker__select:hover{background:#153c2d}.cuk-making-picker .cuk-making-picker__select:focus-visible{outline:3px solid #b5914b;outline-offset:3px}.cuk-making-picker .cuk-making-picker__select:disabled{opacity:.5;cursor:default}@media(max-width:700px){.cuk-making-picker [data-cuk-fabric-grid]{grid-template-columns:repeat(2,minmax(0,1fr))}.cuk-making-picker .cuk-making-picker__select{font-size:13px}}@media(max-width:420px){.cuk-making-picker [data-cuk-fabric-grid]{grid-template-columns:1fr}}`;
  document.head.append(style);
  const experience = window.CurtainsUKFabricExperience || {};
  window.CurtainsUKFabricExperience = { ...experience, enhanceCard(card, fabric, ...args) {
    experience.enhanceCard?.(card, fabric, ...args);
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/.test(fabric.id || '')) return;
    const select = document.createElement('button');
    select.type = 'button'; select.className = 'cuk-making-picker__select';
    select.textContent = 'Use this fabric in Making Studio →';
    select.setAttribute('aria-label', `Use ${fabric.design} in ${fabric.colour} in Making Studio`);
    select.addEventListener('click', () => parent.postMessage({ type: 'cuk:making-fabric', token, fabricId: fabric.id }, location.origin));
    card.querySelector('.cuk-fabric__body')?.prepend(select);
    // Existing destinations remain available and open outside the chooser.
    card.querySelectorAll('a[href]').forEach(link => { link.target = '_blank'; link.rel = 'noopener'; });
  } };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) parent.postMessage({ type: 'cuk:making-picker-close', token }, location.origin);
  });
  parent.postMessage({ type: 'cuk:making-picker-ready', token }, location.origin);
})();
