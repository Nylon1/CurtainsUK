export function calculate(v) {
 const n=(key,optional=false)=>{const raw=v[key];if(optional&&(raw===''||raw==null))return null;const x=Number(raw);if(!Number.isFinite(x)||x<0||(!optional&&x===0))throw Error('Check your '+key+' measurement.');return x;};
 if(!['track','pole'].includes(v.support)||!['pair','single'].includes(v.panels))throw Error('Choose a track or pole and the number of curtains.');
 const width=n('width');if(width>2000)throw Error('Enter the track or pole width in centimetres (up to 2,000 cm).');
 const pair=v.panels!=='single',overlap=pair?(n('overlap',true)||0):0,leftReturn=n('leftReturn',true)||0,rightReturn=n('rightReturn',true)||0,leftSpan=pair?(n('leftSpan',true)??width/2):width;
 if(pair&&(leftSpan<=0||leftSpan>=width))throw Error('Left curtain coverage must be between 0 and the total width.');
 const targets=pair?[leftSpan+overlap/2+leftReturn,width-leftSpan+overlap/2+rightReturn]:[width+leftReturn+rightReturn];
 if(targets.some(x=>!Number.isFinite(x)||x>2000))throw Error('Check your extra allowances: each gathered heading must be no wider than 2,000 cm.');
 const panels=targets.map((target,i)=>{const flat=n(i?'flatRight':'flatLeft',true);if(flat===null)throw Error(`Enter the ${pair?(i?'right':'left'):'curtain'} flat width in centimetres.`);if(flat!==null&&flat>10000)throw Error('Enter flat panel widths in centimetres, up to 10,000 cm.');if(flat!==null&&flat<=target)throw Error(`${pair?(i?'Right':'Left'):'Your'} curtain must be wider flat than its gathered target (${target.toFixed(1)} cm). Check panel width or coverage.`);const hooks=Math.ceil(target/8)+1;return{target,flat,fullness:flat?flat/target:null,reduction:flat?flat-target:null,hooks,spacing:target/(hooks-1),recommended:true};});
 const drop=n('drop',true);if(drop!==null&&(drop<=0||drop>1000))throw Error('Enter the actual curtain drop in centimetres (up to 1,000 cm).');return{width,pair,overlap,leftReturn,rightReturn,panels,drop,row:v.support==='pole'||v.cover==='below'?0:2};
}
export function tiePosition(drop,percent=100/3){return{aboveHem:drop*percent/100,belowTop:drop*(1-percent/100)};}
export const cm=x=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(x)+' cm';
export function checkGathered(raw,target){
 const shown=Math.round((target+Number.EPSILON)*10)/10;
 if(raw===''||raw==null)return {state:'pending',message:'Your target is '+cm(shown)+'. Measure the heading to check it.'};
 const actual=Number(raw);if(!Number.isFinite(actual)||actual<=0)return{state:'invalid',message:'Enter a measured width greater than zero in centimetres.'};
 const difference=actual-shown;
 if(Math.abs(difference)<0.051)return{state:'matched',message:'Matches your '+cm(shown)+' target. Keep this width when you spread the pleats.'};
 return{state:'adjust',message:difference>0?'Gather another '+cm(difference)+' of heading width to reach '+cm(shown)+'.':'Ease the heading out by '+cm(-difference)+' to reach '+cm(shown)+'.'};
}
