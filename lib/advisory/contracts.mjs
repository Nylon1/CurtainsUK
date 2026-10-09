export class AdvisoryError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export const fail = (code, status) => { throw new AdvisoryError(code, status); };
export const UUID = '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
export const FABRIC_ID = '^[a-zA-Z0-9][a-zA-Z0-9-]{0,149}$';
export const string = (maxLength = 500, extra = {}) => ({ type:'string', maxLength, ...extra });
export const object = properties => ({ type:'object', properties, required:Object.keys(properties), additionalProperties:false });
export const array = (items, maxItems = 6) => ({ type:'array', items, maxItems });
export const nullable = schema => ({ anyOf:[schema,{type:'null'}] });
export function validate(schema, value) {
  if (schema.anyOf) { for (const option of schema.anyOf) { try { return validate(option,value); } catch {} } return fail('INVALID_INPUT'); }
  if (schema.type === 'null') { if (value !== null) fail('INVALID_INPUT'); return value; }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('INVALID_INPUT');
    if (Object.keys(value).some(k=>!Object.hasOwn(schema.properties,k)) || schema.required.some(k=>!Object.hasOwn(value,k))) fail('INVALID_INPUT');
    return Object.fromEntries(Object.entries(schema.properties).map(([k,v])=>[k,validate(v,value[k])]));
  }
  if (schema.type === 'array') { if (!Array.isArray(value) || value.length > schema.maxItems) fail('INVALID_INPUT'); return value.map(v=>validate(schema.items,v)); }
  if (schema.type === 'integer') { if (!Number.isSafeInteger(value) || value < (schema.minimum??0) || value > (schema.maximum??1e8)) fail('INVALID_INPUT'); }
  else if (typeof value !== schema.type) fail('INVALID_INPUT');
  if (typeof value === 'string' && (value.length > schema.maxLength || value.length < (schema.minLength??0) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (schema.pattern && !new RegExp(schema.pattern).test(value)))) fail('INVALID_INPUT');
  if (schema.enum && !schema.enum.includes(value)) fail('INVALID_INPUT');
  return value;
}
export const contextSchema = object({
  version:string(3,{enum:['1']}), source:string(30,{enum:['room-visualiser','fabric-intelligence','customer-notes']}),
  consent:{type:'boolean',enum:[true]}, room:nullable(string(12,{enum:['living','bedroom','lounge','office']})),
  fabricIds:array(string(150,{pattern:FABRIC_ID})),
  colours:array(string(60),8), heading:nullable(string(60)),
  lighting:nullable(string(12,{enum:['daylight','evening','inspection']})),
  curtainPosition:nullable({type:'integer',minimum:0,maximum:100}),
  preferences:array(string(200),8), references:array(string(100),5), feedback:string(1200)
});
export const requestSchema = object({
  requestId:string(36,{pattern:UUID}), sessionId:nullable(string(36,{pattern:UUID})),
  revision:nullable({type:'integer',minimum:0,maximum:10000}),
  action:string(16,{enum:['start','message','context','summary','save','resume','recover','delete']}),
  text:nullable(string(2000,{minLength:1})), context:nullable(contextSchema), consent:{type:'boolean'},
  recoveryToken:nullable(string(100,{pattern:'^[0-9a-f-]{36}\\.[A-Za-z0-9_-]{43}$'}))
});
export function parseCommand(value) {
  const c=validate(requestSchema,value);
  if(c.action==='start') { if(c.sessionId!==null||c.revision!==null) fail('INVALID_INPUT'); }
  else if(c.action!=='recover' && (!c.sessionId||c.revision===null)) fail('INVALID_INPUT');
  if((c.action==='message') !== (c.text!==null) || (c.action==='context') !== (c.context!==null) || (c.action==='recover') !== (c.recoveryToken!==null)) fail('INVALID_INPUT');
  if(['save','recover'].includes(c.action) && !c.consent) fail('CONSENT_REQUIRED');
  if(c.action==='recover' && (c.sessionId!==null||c.revision!==null)) fail('INVALID_INPUT');
  return c;
}
export const responseSchema = object({
  text:string(3000,{minLength:1}), stage:string(20,{enum:['understand','investigate','recommend','refine','conclude']}),
  palette:array(string(60),5), patternDirection:string(220), textureDirection:string(220),
  alternatives:array(string(250),3), questions:array(string(220),3), nextSteps:array(string(250),4),
  evidenceIds:array(string(100),12), fabricIds:array(string(150,{pattern:FABRIC_ID}),4)
});
export const tools = [
  {type:'function',name:'get_tool_guidance',description:'Verified current customer controls and limitations. Consult before teaching a CurtainsUK tool.',strict:true,parameters:object({tool:string(30,{enum:['fabric-intelligence','room-visualiser','curtain-style','samples']})})},
  {type:'function',name:'lookup_fabric_knowledge',description:'Read exact identities anywhere in Fabric Master; knowledge is NOT proof of purchase availability.',strict:true,parameters:object({ids:array(string(150,{pattern:FABRIC_ID}))})},
  {type:'function',name:'find_fabric_identities',description:'Bounded indexed Fabric Master ID-prefix lookup, including unpublished identities; no availability claim.',strict:true,parameters:object({prefix:string(40,{minLength:3,pattern:'^[A-Za-z0-9-]+$'})})},
  {type:'function',name:'search_retail_fabrics',description:'Optional approved retail search when customer asks for specific fabrics. No prices or stock promises.',strict:true,parameters:object({query:string(100),colour:string(50),pattern:string(50)})},
  {type:'function',name:'search_fabric_knowledge',description:'Indexed descriptive knowledge search including unpublished identities. Coverage may be partial. Never evidence of purchase eligibility. Search colour, pattern, texture, composition and governed descriptions.',strict:true,parameters:object({query:string(100,{minLength:2}),colour:string(50),pattern:string(50),texture:string(50),composition:string(50)})}
];
