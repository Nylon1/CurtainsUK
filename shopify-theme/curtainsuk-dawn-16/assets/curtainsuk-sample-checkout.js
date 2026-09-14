(() => {
  async function sampleJson(url, options) {
    const response=await fetch(url,{...options,headers:{'Content-Type':'application/json'}});
    const data=await response.json(); if(!response.ok) throw Error(data.error || 'Sample availability could not be confirmed.'); return data;
  }
  window.addEventListener('curtainsuk:sample-add', async (event) => {
    const {root,sample,button}=event.detail;
    if(button.disabled) return;
          button.disabled = true;
          const status = root.querySelector('[data-cuk-sample-status]');
          try {
            const prepared = await sampleJson((root.dataset.engineBase || '/apps/curtainsuk-decision').replace(/\/$/,'')+'/sample-order', {method:'POST',body:JSON.stringify({fabricId:sample.fabricId,hciCommerceToken:sample.consultationContext?.commerceToken})});
            status.textContent = `${prepared.properties.Fabric} · SKU ${prepared.properties['Supplier SKU']} · ${new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(prepared.priceMinor/100)} per sample. Delivery calculated at checkout.`;
            if (root.dataset.purchaseControlsEnabled !== 'true' || prepared.purchaseEnabled !== true) {
              status.textContent += ' Sample purchasing is not yet enabled.'; return;
            }
            const cartResponse = await fetch('/cart.js',{cache:'no-store'});
            if (!cartResponse.ok) throw Error('Unable to check your basket. Please retry.');
            const cart = await cartResponse.json();
            const existing = cart.items.find(line => line.variant_id === prepared.variantId && line.properties?.['Fabric Master ID'] === sample.fabricId);
            if (existing) {
              if (existing.quantity !== 1 || existing.properties?.['_CurtainsUK identity signature'] !== prepared.properties['_CurtainsUK identity signature']) throw Error('Your basket already contains this sample with different details. Review it before continuing.');
            } else {
              const added = await fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{id:prepared.variantId,quantity:1,properties:prepared.properties}]})});
              if (!added.ok) throw Error('Sample addition could not be confirmed. Review your basket before retrying.');
            }
            // No automatic retry after an uncertain write. A repeat first reads the cart.
            location.assign('/cart');
          } catch(error) { status.textContent = error.message || 'Sample availability could not be confirmed. Please retry.'; }
          finally {button.disabled = false;}
  });
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cuk-sample-checkout]');
    if (!button) return;
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    const message = document.getElementById('cart-errors');
    try {
      const cartResponse = await fetch('/cart.js',{cache:'no-store'});
      if(!cartResponse.ok) throw Error('Your basket could not be checked. Please retry.');
      const cart = await cartResponse.json();
      if(!cart.items.length || cart.items.length>20) throw Error('Please review your sample basket.');
      for (const item of cart.items) {
        if(item.variant_id!==56120226873723 || !item.properties?.['Fabric Master ID']) throw Error('This basket contains an item that is not ready for sample checkout.');
        const response=await fetch('/apps/curtainsuk-decision/sample-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fabricId:item.properties['Fabric Master ID'],properties:item.properties})});
        const result=await response.json();
        if(!response.ok || result.purchaseEnabled!==true) throw Error('Current sample availability could not be confirmed. Your basket is saved; please retry later.');
        if(item.final_price!==result.priceMinor) throw Error('The sample price has changed. Please review your basket.');
      }
      location.assign('/checkout');
    } catch(error) {
      message.textContent=error.message || 'Checkout could not be confirmed. Please retry.';
      button.disabled=false;
    }
  });
})();
