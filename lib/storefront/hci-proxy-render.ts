const base = '/apps/curtainsuk-decision';
export function customerProxyHtml(html: string) {
  return html.replaceAll('/hci-assets/consultation.css',base+'/consultation-asset?name=consultation.css')
    .replaceAll('/hci-assets/consultation.js',base+'/consultation-asset?name=consultation.js')
    .replaceAll('THE PRIVATE CONSULTATION · INTERNAL PREVIEW','YOUR CURTAIN CONSULTATION')
    .replace(/Internal staging preview\. Customer recommendations remain disabled\s+until HCI passes quality review\./g,'Choose yourself, show us your room, or let us guide you.')
    .replaceAll('?preview_theme_id=182264234363','');
}
export function customerProxyScript(script: string) {
  const transport = `
  async function proxyFetch(url,options) {
    const key='curtainsuk_customer_proxy_capability_v1';
    let capability=localStorage.getItem(key);
    if(!capability) {
      const bootstrap=await fetch('${base}/hci-session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!bootstrap.ok) throw Error('Your consultation is temporarily unavailable.');
      capability=(await bootstrap.json()).capability;
      localStorage.setItem(key,capability);
    }
    const response=await fetch(url,{...options,body:JSON.stringify({capability,command:JSON.parse(options.body)})});
    if(response.status===401) {localStorage.removeItem(key);throw Error('Your consultation access has expired. Start a new consultation.');}
    return response;
  }
`;
  return script.replace('(() => {','(() => {'+transport)
    .replace('curtainsuk_hci_session_v2','curtainsuk_customer_proxy_session_v1')
    .replace('fetch("/api/admin/curtain-consultation", {',`proxyFetch("${base}/hci-command", {`)
    .replaceAll('/api/admin/curtain-consultation/assets/',base+'/consultation-asset?name=')
    .replaceAll('/api/admin/curtain-consultation?fabric=',base+'/catalog?view=retail&fabric=')
    .replaceAll('/curtainsuk-image-privacy',base+'/image-privacy')
    .replace('url.searchParams.set("preview_theme_id", "182264234363");','');
}
