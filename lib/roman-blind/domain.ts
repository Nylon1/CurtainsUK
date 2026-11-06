import {createHash} from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type RomanSpec={version:1;productType:'ROMAN_BLIND';id:string;fabricId:string;width:number;drop:number;lining:'STANDARD'|'BLACKOUT';fold:'stacked'|'cascade';quantity:number;measurementsConfirmed:true};
const size=(value:unknown,max:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=30&&value<=max&&Math.abs(value*10-Math.round(value*10))<1e-7;
export function parseRomanSpec(value:unknown):RomanSpec{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('ROMAN_SPEC_INVALID');
 const s=value as Record<string,unknown>;
 if(Object.keys(s).some(k=>!['version','productType','id','fabricId','width','drop','lining','fold','quantity','measurementsConfirmed'].includes(k))||
 s.version!==1||s.productType!=='ROMAN_BLIND'||typeof s.id!=='string'||!UUID.test(s.id)||
 typeof s.fabricId!=='string'||!/^[a-z0-9][a-z0-9-]{1,100}$/.test(s.fabricId)||!size(s.width,300)||!size(s.drop,250)||
 !['STANDARD','BLACKOUT'].includes(String(s.lining))||!['stacked','cascade'].includes(String(s.fold))||
 !Number.isSafeInteger(s.quantity)||Number(s.quantity)<1||Number(s.quantity)>50||s.measurementsConfirmed!==true)throw Error('ROMAN_SPEC_INVALID');
 return s as RomanSpec;
}
export function romanSpecDigest(spec:RomanSpec){return createHash('sha256').update(JSON.stringify(spec)).digest('hex');}
