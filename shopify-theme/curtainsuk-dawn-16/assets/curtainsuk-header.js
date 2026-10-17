/* Independent navigation; Shopify remains authoritative for search and cart. */
(function syncSavedHouseNavigation() {
  const update = () => {
    const links = document.querySelectorAll('[data-cuk-house-nav]');
    if (!links.length || !window.CurtainsUKRooms) return;
    let count = 0;
    try { count = window.CurtainsUKRooms.orderItems(window.CurtainsUKRooms.read() || window.CurtainsUKRooms.ensure()).reduce((n,item)=>n+item.quantity,0); } catch { return; }
    links.forEach((link) => {
      link.textContent = count ? `Design My Home · ${count}` : 'Design My Home';
      link.setAttribute('aria-label', count ? `Design My Home, ${count} saved ${count === 1 ? 'item' : 'items'}` : 'Design My Home');
    });
  };
  window.addEventListener('storage', (event) => { if (event.key === window.CurtainsUKRooms?.KEY) update(); });
  window.addEventListener('pageshow', update);
  update();
})();
if (!customElements.get('curtainsuk-header')) {
  customElements.define('curtainsuk-header', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.addEventListener('open', event => {
        if (!(event.target instanceof HTMLElement) || !event.target.matches('shopify-account')) return;
        const bottom = Math.max(0, Math.round(event.target.getBoundingClientRect().bottom));
        event.target.style.setProperty('--account-dialog-top', `${bottom}px`);
      }, { ...options, capture: true });
      this.dialogs = [...this.querySelectorAll('dialog')];
      this.disclosures = [...this.querySelectorAll('.cuknav__disclosure')];
      this.querySelectorAll('[data-open]').forEach(trigger => {
        trigger.addEventListener('click', event => {
          const dialog = this.dialogs.find(item => item.dataset.dialog === trigger.dataset.open);
          if (!dialog || !dialog.showModal) return;
          event.preventDefault();
          this.dialogs.filter(item => item.open).forEach(item => item.close());
          this.closeDisclosures();
          this.returnFocus = trigger;
          this.previousOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
          trigger.setAttribute('aria-expanded', 'true');
          dialog.showModal();
          if (dialog.dataset.dialog === 'search') dialog.querySelector('input').focus();
        }, options);
      });
      this.dialogs.forEach(dialog => {
        dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close(), options);
        dialog.addEventListener('close', () => {
          document.body.style.overflow = this.previousOverflow ?? '';
          this.querySelectorAll('[data-open]').forEach(item => item.setAttribute('aria-expanded', 'false'));
          this.returnFocus?.focus({ preventScroll: true });
        }, options);
        dialog.addEventListener('click', event => {
          const link = event.target.closest('a[href]');
          if (link) {
            const url = new URL(link.href);
            if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash) {
              setTimeout(() => dialog.close(), 0);
            }
            return;
          }
          if (event.target === dialog) {
            const box = dialog.getBoundingClientRect();
            if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
          }
        }, options);
      });
      this.disclosures.forEach(details => {
        const summary = details.querySelector('summary');
        details.addEventListener('click', event => {
          const link = event.target.closest('a[href]');
          if (!link) return;
          const url = new URL(link.href);
          if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash) {
            setTimeout(() => { details.open = false; summary.setAttribute('aria-expanded', 'false'); }, 0);
          }
        }, options);
        details.addEventListener('toggle', () => {
          summary.setAttribute('aria-expanded', String(details.open));
          if (details.open) this.closeDisclosures(details);
        }, options);
        details.addEventListener('keydown', event => {
          if (event.key === 'Escape' && details.open) {
            event.preventDefault(); event.stopPropagation(); details.open = false;
            summary.setAttribute('aria-expanded', 'false'); summary.focus();
          }
        }, options);
        details.addEventListener('focusout', event => {
          // relatedTarget is the arriving control. activeElement can briefly be
          // body during focusout, which would close the menu before Tab arrives.
          if (event.relatedTarget && !details.contains(event.relatedTarget)) details.open = false;
        }, options);
      });
      document.addEventListener('click', event => {
        if (!event.target.closest('curtainsuk-header .cuknav__disclosure')) this.closeDisclosures();
      }, options);
      this.mobileQuery = matchMedia('(max-width: 1050px)');
      this.mobileQuery.addEventListener('change', () => {
        this.dialogs.filter(item => item.open).forEach(item => item.close());
        this.closeDisclosures();
      }, options);
    }
    closeDisclosures(except) {
      this.disclosures?.forEach(item => {
        if (item !== except) { item.open = false; item.querySelector('summary').setAttribute('aria-expanded', 'false'); }
      });
    }
    disconnectedCallback() {
      if (this.dialogs?.some(item => item.open)) document.body.style.overflow = this.previousOverflow ?? '';
      this.controller?.abort(); this.controller = null;
    }
  });
}
