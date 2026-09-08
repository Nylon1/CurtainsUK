// Match Next's server-only marker resolution when running a trusted Node rehearsal.
import {registerHooks,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
export const serverScriptHooks = registerHooks({resolve(specifier,context,next){return specifier==='server-only'?{url:pathToFileURL(require.resolve('next/dist/compiled/server-only/empty.js')).href,shortCircuit:true}:next(specifier,context);}});
