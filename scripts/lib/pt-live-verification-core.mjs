export const checkKeys = ['exact_single_result', 'official_image', 'governed_price', 'current_stock', 'manufacturer_width', 'manufacturer_care', 'intelligence_present'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const passed = row => checkKeys.every(key => row[key] === true) && !row.duplicate_results;

export function assess(item, source, response, value) {
  const expectedGuide = Math.round(Number(source.supplier_price_row.printed_price) * 100) * 3;
  const fabrics = value.fabrics ?? [];
  const fabric = fabrics.find(f => f.id === item.fabric_id);
  return {
    fabric_id: item.fabric_id, http_status: response.status,
    exact_single_result: response.ok && value.total === 1 && fabrics.length === 1 && Boolean(fabric),
    official_image: Boolean(fabric?.images?.some(i => i.imageType === 'MAIN' && i.approved && /^https:\/\/cdn\.shopify\.com\//.test(i.url))),
    governed_price: fabric?.priceReady === true && fabric?.browseGuide?.amountMinor === expectedGuide,
    current_stock: ['AVAILABLE', 'OUT_OF_STOCK'].includes(fabric?.commercialStockState),
    available_to_order: fabric?.currentStockConfirmed === true,
    manufacturer_width: fabric?.fullWidthMm === Number(item.manufacturer.Width) * 10,
    manufacturer_care: ![item.manufacturer['Wash Care 1'], item.manufacturer['Wash Care 2']].some(x => typeof x === 'string' && x.trim()) || (Array.isArray(fabric?.careInstructions) ? fabric.careInstructions.length > 0 : Boolean(fabric?.careInstructions)),
    intelligence_present: Boolean(fabric?.visualIntelligence),
    duplicate_results: fabrics.filter(f => f.id === item.fabric_id).length > 1,
  };
}

export async function verifyCohort({ manifest, coverage, concurrency = 1, requestGapMs = 650, resume = [], fetchImpl = fetch, onProgress = async () => {} }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3 || requestGapMs < 650) throw Error('PUBLIC_CHECK_CONCURRENCY_OR_RATE_INVALID');
  const byId = new Map(manifest.map(item => [item.fabric_id, item]));
  if (!manifest.length || byId.size !== manifest.length || new Set(manifest.map(r=>r.supplier_sku)).size !== manifest.length) throw Error('PUBLIC_CHECK_SCOPE_INVALID');
  if (!Array.isArray(resume) || new Set(resume.map(r=>r.fabric_id)).size !== resume.length || resume.some(r=>!byId.has(r.fabric_id))) throw Error('PUBLIC_CHECK_RESUME_SCOPE_INVALID');
  const sourceBySku = new Map();
  for (const item of manifest) {
    const rows = coverage.coverage.filter(row=>row.supplier_sku===item.supplier_sku);
    if (rows.length!==1 || !(Number(rows[0].supplier_price_row.printed_price)>0)) throw Error('PUBLIC_CHECK_PRICE_COVERAGE_INVALID');
    sourceBySku.set(item.supplier_sku,rows[0]);
  }
  const retained = new Map(resume.filter(passed).map(row=>[row.fabric_id,row]));
  const results = manifest.map(item=>retained.get(item.fabric_id));
  const pending = manifest.map((item,index)=>({item,index})).filter(({index})=>!results[index]);
  const metrics = { startedAt:new Date().toISOString(), concurrency, requestGapMs, requests:0, retries:0, resumed:retained.size, requestMs:0, rateWaitMs:0, maxActiveRequests:0 };
  let cursor=0, active=0, nextAllowed=0, rateQueue=Promise.resolve(), writes=Promise.resolve();
  const permit = () => {
    const allowed = rateQueue.then(async()=> {
      const waitStart=performance.now();
      while (nextAllowed>Date.now()) await sleep(nextAllowed-Date.now());
      metrics.rateWaitMs+=performance.now()-waitStart;
      nextAllowed=Date.now()+requestGapMs;
    });
    rateQueue=allowed.catch(()=>{});
    return allowed;
  };
  const save = () => {
    writes=writes.then(()=>onProgress(results.filter(Boolean),metrics));
    return writes;
  };
  async function worker() {
    while (cursor<pending.length) {
      const {item,index}=pending[cursor++];
      const url=new URL('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog');
      url.search=new URLSearchParams({view:'retail',browseGuide:'1',query:item.supplier_sku}).toString();
      for (let attempt=1;attempt<=3;attempt++) {
        await permit();
        let requestStarted;
        try {
          active++;metrics.maxActiveRequests=Math.max(metrics.maxActiveRequests,active);metrics.requests++;
          requestStarted=performance.now();
          const response=await fetchImpl(url,{signal:AbortSignal.timeout(45000)});
          if (response.status>=500 || response.status===429) {
            const raw=response.headers.get('retry-after');
            const retryDelay=raw && /^\d+$/.test(raw) ? Number(raw)*1000 : raw && Number.isFinite(Date.parse(raw)) ? Math.max(0,Date.parse(raw)-Date.now()) : 0;
            nextAllowed=Math.max(nextAllowed,Date.now()+Math.max(2500*attempt,retryDelay));
            throw Error(`HTTP_${response.status}`);
          }
          let value;try {value=await response.json();} catch {throw Error(`NON_JSON_HTTP_${response.status}`);}
          results[index]=assess(item,sourceBySku.get(item.supplier_sku),response,value);
          break;
        } catch(error) {
          if(attempt<3) {metrics.retries++;nextAllowed=Math.max(nextAllowed,Date.now()+2500*attempt);}
          else results[index]={fabric_id:item.fabric_id,...Object.fromEntries(checkKeys.map(k=>[k,false])),duplicate_results:false,error:error instanceof Error ? error.message : 'PUBLIC_FETCH_FAILED'};
        } finally {
          if(requestStarted!==undefined) {metrics.requestMs+=performance.now()-requestStarted;active--;}
        }
      }
      await save();
    }
  }
  await Promise.all(Array.from({length:Math.min(concurrency,pending.length)},worker));
  await writes;
  metrics.completedAt=new Date().toISOString();metrics.wallMs=Date.parse(metrics.completedAt)-Date.parse(metrics.startedAt);
  const summary=Object.fromEntries(checkKeys.map(k=>[k,results.filter(row=>row[k]).length]));
  summary.duplicates=results.filter(row=>row.duplicate_results).length;
  return {checked_at:metrics.completedAt,host:'www.curtainsuk.com',summary,metrics,results};
}
