import {handleSmartTrack} from '@/lib/smart-track/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{path?:string[]}>}){return handleSmartTrack(request,(await context.params).path??[]);}
export {handle as GET,handle as POST};
