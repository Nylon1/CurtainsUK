export function calculateEyelet(d){
 const val=(k,label,required=false)=>{if(d[k]===''||d[k]==null){if(required)throw Error('Enter '+label+'.');return null;}const n=Number(d[k]);if(!Number.isFinite(n)||n<=0||n>10000)throw Error('Check '+label+'.');return n;};
 const width=val('width','your pole width',true),pair=d.panels!=='single',left=pair?(val('leftSpan','left coverage')??width/2):width;
 if(pair&&left>=width)throw Error('Left coverage must be less than the pole width.');
 const panels=[{name:pair?'Left curtain':'Your curtain',flat:val('flatLeft','the left flat width',true),span:left}];
 if(pair)panels.push({name:'Right curtain',flat:val('flatRight','the right flat width',true),span:width-left});
 panels.forEach((p,i)=>{if(p.flat<=p.span)throw Error(p.name+' needs more flat fabric than its coverage to form folds.');p.fullness=p.flat/p.span;p.eyelets=val(i?'eyeletsRight':'eyeletsLeft',p.name.toLowerCase()+' eyelet count');if(p.eyelets!==null&&(!Number.isInteger(p.eyelets)||p.eyelets<2||p.eyelets>1000))throw Error('Enter a whole eyelet count of at least 2 for '+p.name.toLowerCase()+'.');p.insideEyelets=p.eyelets===null?null:p.eyelets-1;});
 const diameter=val('diameter','pole diameter'),inner=val('inner','eyelet inner diameter');
 if(diameter&&inner&&diameter>=inner)throw Error('The pole must be smaller than the eyelet opening.');
 const drop=val('drop','curtain drop'),rise=val('rise','fabric above the eyelet'),height=val('height','pole height');
 if(drop&&rise&&rise>=drop)throw Error('The fabric above the eyelet must be less than the curtain drop.');
 return {width,pair,panels,diameter,inner,drop,rise,height,hem:drop&&rise&&height?height+rise-drop:null};
}
