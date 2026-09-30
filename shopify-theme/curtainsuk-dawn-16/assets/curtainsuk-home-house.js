/* Uses the same on-device House store as Build My Rooms. It never stores a
   second homepage cart or treats browser values as commercial truth. */
(() => {
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const render = (root) => {
    const Store = window.CurtainsUKRooms;
    if (!Store) return;
    let total;
    try { total = Store.totals(Store.read() || Store.ensure()); } catch { return; }
    const hasHouse = total.curtains > 0;
    root.innerHTML = `<div class="cukhouse-home__wrap ${hasHouse ? 'cukhouse-home__wrap--saved' : ''}"><div class="cukhouse-home__copy"><p class="cukhouse-home__eyebrow">${hasHouse ? 'Your House of Curtains' : 'House of Curtains'}</p><h2>${hasHouse ? 'Continue your home' : 'Real Homes. Room by Room.'}</h2><p>${hasHouse ? `${total.rooms} ${total.rooms === 1 ? 'room' : 'rooms'} · ${total.curtains} ${total.curtains === 1 ? 'window' : 'windows'} saved. Your rooms are saved on this device.` : 'Start with one window. Save your rooms and build the curtains for your home at your own pace.'}</p><a class="cukhouse-home__button" href="/pages/build-my-rooms">${hasHouse ? 'Continue my rooms' : 'Build my rooms'}</a></div>${hasHouse ? `<div class="cukhouse-home__saved"><span aria-hidden="true">●</span><strong>${total.curtains} ${total.curtains === 1 ? 'window' : 'windows'} saved</strong><p>One place, whole home.</p></div>` : `<div class="cukhouse-home__visual"><img src="${escape(root.dataset.houseHero)}" width="1536" height="1024" loading="lazy" alt="Room inspiration with neutral curtains"><p>Room inspiration</p></div>`}</div>`;
  };
  const init = () => {
    document.querySelectorAll('[data-cuk-home-house]').forEach(render);
    window.addEventListener('storage', (event) => { if (event.key === window.CurtainsUKRooms?.KEY) document.querySelectorAll('[data-cuk-home-house]').forEach(render); });
    window.addEventListener('pageshow', () => document.querySelectorAll('[data-cuk-home-house]').forEach(render));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})();
