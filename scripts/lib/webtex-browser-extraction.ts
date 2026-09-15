import { captureReadyWebtexProduct, type WebtexExpectedProduct, type WebtexProductRead } from '../../lib/supplier-sync/webtex-product-readiness';

// Inject the authorised cua_repl tab. This module opens no browser connection,
// reads no cookies, and makes no independent supplier HTTP requests.
type Locator = {
  innerText(): Promise<string>;
  isVisible(): Promise<boolean>;
  click(): Promise<void>;
  filter(options: {hasText: RegExp}): Locator;
  waitFor(options: {state:'visible';timeoutMs:number}): Promise<void>;
  evaluate<T>(read: (body: HTMLElement) => T): Promise<T>;
};
type Scope = { locator(selector:string):Locator; getByText(text:string,options:{exact:true}):Locator };
export interface WebtexBrowserTab {
  playwright: Scope & {
    frameLocator(selector:string):Scope;
    getByRole(role:string,options:{name:string;exact:true}):Locator;
  };
}

export async function extractWebtexProduct(tab: WebtexBrowserTab, expected: WebtexExpectedProduct, collection: string) {
  const frame = () => tab.playwright.frameLocator('#ifrModal');
  const assertSession = async () => {
    const text = await tab.playwright.locator('body').innerText();
    if (/Please enter your login details below|PT TRADE ORDERS\s*User Name:/i.test(text)) throw new Error('WEBTEX_AUTH_REQUIRED');
  };
  const read = async ():Promise<WebtexProductRead> => {
    await assertSession();
    if (!(await tab.playwright.locator('#ifrModal').isVisible())) return {sku:'',description:'',fullWidth:'',standardPrice:'',freeStock:'',rawFields:'',imageSrc:null};
    return frame().locator('body').evaluate(body => {
      const text = (id:string) => (body.querySelector<HTMLElement>(id)?.innerText ?? '').trim();
      if (/Please enter your login details below/i.test(body.innerText)) throw new Error('WEBTEX_AUTH_REQUIRED');
      return {
        sku:body.innerText.match(/Product Code:\s*(\d+\/\d+)/)?.[1] ?? '',
        description:text('#productdesc'),fullWidth:text('#greywidth'),
        standardPrice:text('#price'),freeStock:text('#freestock'),
        rawFields:text('#reportCriteria'),imageSrc:body.querySelector('#imgProducts')?.getAttribute('src') ?? null,
      };
    });
  };
  const close = async () => {
    if (await tab.playwright.locator('#ifrModal').isVisible()) await frame().locator('img[src="../../img/close.gif"]').click();
  };
  const open = async () => {
    await assertSession();
    await tab.playwright.getByRole('link',{name:expected.description,exact:true}).click();
  };
  await open();
  const result = await captureReadyWebtexProduct(expected,{
    read,
    reopen:async()=>{await close();await open();},
    waitForFields:async timeoutMs=>{
      const deadline = Date.now()+timeoutMs;
      const wait = async (locator:Locator) => {
        await assertSession();
        const remaining = deadline-Date.now();
        if(remaining<=0)throw new Error('WEBTEX_FIELDS_TIMEOUT');
        await locator.waitFor({state:'visible',timeoutMs:remaining});
      };
      try {
        await wait(frame().getByText('Product Code: '+expected.sku,{exact:true}));
        // Wait for actual values, not the labels or the early product heading.
        await wait(frame().locator('#productdesc').filter({hasText:/\S/}));
        await wait(frame().locator('#greywidth').filter({hasText:/^\s*\d+(?:\.\d+)?\s+cm\s*$/}));
        await wait(frame().locator('#price').filter({hasText:/^\s*\d+(?:\.\d+)?\s+STERLING\s*$/}));
        await wait(frame().locator('#freestock').filter({hasText:/^\s*\d+(?:\.\d+)?\s+Metres\s*$/}));
      } catch(error) {
        await assertSession();
        const message=error instanceof Error?error.message:'';
        if(/WEBTEX_AUTH_REQUIRED/.test(message))throw new Error('WEBTEX_AUTH_REQUIRED');
        if(/WEBTEX_FIELDS_TIMEOUT|timeout|timed out|No element matched/i.test(message))throw new Error('WEBTEX_FIELDS_TIMEOUT');
        throw new Error('WEBTEX_SYSTEMIC_FAILURE');
      }
    },
  });
  await close();
  return result.status==='READY' ? {
    status:result.status,attempts:result.attempts,
    observation:{sku:expected.sku,collection,observed_at:new Date().toISOString(),raw_fields:result.read.rawFields,image_src:result.read.imageSrc},
  } : {status:result.status,sku:expected.sku,collection,reason:result.reason,attempts:result.attempts,last:result.last};
}
