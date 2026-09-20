const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/hamza/curtainsuk-fabrics-landing/node_modules/sharp');
const output = path.resolve(__dirname, '../artifacts/curtain-style-v1');
const inputs = [
 ['Apex wave project','C:/Users/hamza/apex-curtains-site/public/images/wave-curtains-apex-window.jpg'],
 ['Apex Milton Keynes','C:/Users/hamza/apex-curtains-site/public/images/apex-curtains - miltonKeynes.jpeg'],
 ['Apex large','C:/Users/hamza/apex-curtains-site/public/images/apex-curtains-large.jpeg'],
 ['Apex barn','C:/Users/hamza/apex-curtains-site/public/images/barn-conversion-apex.jpeg'],
 ['Apex lounge curtains','C:/Users/hamza/apex-curtains-site/public/images/commercial/airport-lounge-curtains.jpeg'],
 ['TrackFit project poster','C:/Users/hamza/Downloads/trackfit-cinematic/public/images/hero/trackfit-entry-poster.jpeg'],
 ['Austin green','C:/Users/hamza/Downloads/AUSTIN GREEN.jpg'],
 ['Austin header','C:/Users/hamza/Downloads/AUSTIN GREEN HEADER.jpg'],
 ['Pinch pleat source unknown','C:/Users/hamza/Downloads/pinch-pleat.jpg'],
 ['Wave pleat source unknown','C:/Users/hamza/Downloads/wave-pleat.jpg'],
 ['Wave living source unknown','C:/Users/hamza/Downloads/wave-pleat-curtains-living.png'],
 ['Oakland source unknown','C:/Users/hamza/Downloads/oakland-ready-made-eyelet-curtains-natural_600x@3x.webp'],
];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const tiles=[];
 for(let i=0;i<inputs.length;i++){
  const [label,file]=inputs[i];
  const image=await sharp(file).rotate().resize(360,290,{fit:'inside'}).extend({top:0,bottom:0,left:0,right:0}).toBuffer();
  const meta=await sharp(image).metadata();
  const left=(i%4)*380, top=Math.floor(i/4)*330;
  tiles.push({input:image,left:left+Math.floor((380-meta.width)/2),top});
  tiles.push({input:Buffer.from(`<svg width="380" height="40"><rect width="380" height="40" fill="#f5f2e9"/><text x="12" y="26" font-family="Arial" font-size="14">${i+1}. ${label}</text></svg>`),left,top:top+290});
 }
 await sharp({create:{width:1520,height:990,channels:3,background:'#f5f2e9'}}).composite(tiles).jpeg({quality:85}).toFile(path.join(output,'selection-sheet.jpg'));
 console.log(path.join(output,'selection-sheet.jpg'));
})();
