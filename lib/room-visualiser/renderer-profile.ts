/** Explicit publication gate. The empty V1 registry deliberately grants nobody access. */
export type RendererProfile = 'STANDARD' | 'FIXED140_SINGLE_WIDTH_V1' | 'FIXED140_SINGLE_WIDTH_100CM_V1' | 'NOT_ELIGIBLE';

type StandardAsset = {fabricId:string;mode:string;hRepeat?:number|null;vRepeat?:number|null};
export type Fixed140Assignment = {
  rendererProfile:'FIXED140_SINGLE_WIDTH_V1';
  fabricId:string;
  usableWidthCm:number;
  sourceWidthPx:number;
  sourceHeightPx:number;
  sourceImage:string;
  sha256:string;
};
export type Fixed140Registry = {version:1;assignments:Record<string,Fixed140Assignment>};
export type Fixed100Assignment = {
  rendererProfile:'FIXED140_SINGLE_WIDTH_100CM_V1';
  fabricId:string;
  usableWidthCm:number;
  sourceWidthPx:number;
  sourceHeightPx:number;
  sourceTopPx:number;
  sourceImage:string;
  sha256:string;
};
export type Fixed100Registry = {version:1;assignments:Record<string,Fixed100Assignment>};
type Fabric = {id:string;horizontalRepeatMm?:number|null;verticalRepeatMm?:number|null;patternMatchType?:string|null};

const sourcePath=/^\/room-visualiser\/fixed140\/([a-f0-9]{64})\.(?:jpe?g|webp)$/;
const shopifySource=/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/0256\/4551\/4861\/files\/cuk-fabric-[a-f0-9]{64}\.jpg$/;
export function validFixed100Assignment(id:string, assignment:Fixed100Assignment|undefined):assignment is Fixed100Assignment {
  if(!assignment||assignment.rendererProfile!=='FIXED140_SINGLE_WIDTH_100CM_V1'||assignment.fabricId!==id)return false;
  const {usableWidthCm,sourceWidthPx,sourceHeightPx,sourceTopPx,sourceImage,sha256}=assignment;
  return shopifySource.test(sourceImage)&&/^[a-f0-9]{64}$/.test(sha256)&&
    Number.isFinite(usableWidthCm)&&usableWidthCm>=70&&usableWidthCm<=200&&
    Number.isSafeInteger(sourceWidthPx)&&sourceWidthPx>=700&&
    Number.isSafeInteger(sourceHeightPx)&&sourceHeightPx>=700&&
    Number.isSafeInteger(sourceTopPx)&&sourceTopPx>=0&&sourceTopPx<sourceHeightPx&&
    (sourceHeightPx-sourceTopPx)*usableWidthCm>=sourceWidthPx*100;
}
export function validFixed140Assignment(id:string, assignment:Fixed140Assignment|undefined):assignment is Fixed140Assignment {
  if(!assignment||assignment.rendererProfile!=='FIXED140_SINGLE_WIDTH_V1'||assignment.fabricId!==id)return false;
  const match=sourcePath.exec(assignment.sourceImage);
  if(!match||match[1]!==assignment.sha256)return false;
  const {usableWidthCm,sourceWidthPx,sourceHeightPx}=assignment;
  return Number.isFinite(usableWidthCm)&&usableWidthCm>=70&&usableWidthCm<=200&&
    Number.isSafeInteger(sourceWidthPx)&&sourceWidthPx>0&&Number.isSafeInteger(sourceHeightPx)&&
    sourceHeightPx*usableWidthCm>=sourceWidthPx*120;
}

export function standardEligible(fabric:Fabric, asset:StandardAsset|undefined) {
  if(!asset||asset.fabricId!==fabric.id||/HALF|OFFSET|STAGGER|BRICK/i.test(fabric.patternMatchType??''))return false;
  return asset.mode==='plain'||(asset.mode==='patterned'&&
    fabric.horizontalRepeatMm===asset.hRepeat!*10&&fabric.verticalRepeatMm===asset.vRepeat!*10);
}

export function resolveRendererProfile(
  fabric:Fabric,
  standardAssets:readonly StandardAsset[],
  registry:Fixed140Registry,
  shortRegistry?:Fixed100Registry,
):RendererProfile {
  // Existing approvals always retain the exact STANDARD route, even if somebody
  // accidentally adds a conflicting V1 assignment in a later registry edit.
  const standardAsset=standardAssets.find(asset=>asset.fabricId===fabric.id);
  if(standardAsset)return standardEligible(fabric,standardAsset)?'STANDARD':'NOT_ELIGIBLE';
  if(registry.version===1&&validFixed140Assignment(fabric.id,registry.assignments[fabric.id]))return 'FIXED140_SINGLE_WIDTH_V1';
  if(shortRegistry?.version===1&&validFixed100Assignment(fabric.id,shortRegistry.assignments[fabric.id]))return 'FIXED140_SINGLE_WIDTH_100CM_V1';
  return 'NOT_ELIGIBLE';
}

export function fixed100AssignmentForId(id:string,standardAssets:readonly StandardAsset[],registry:Fixed140Registry,shortRegistry:Fixed100Registry) {
  if(standardAssets.some(asset=>asset.fabricId===id)||validFixed140Assignment(id,registry.assignments[id]))return null;
  const assignment=shortRegistry.assignments[id];
  return shortRegistry.version===1&&validFixed100Assignment(id,assignment)?assignment:null;
}

export function v1AssignmentForId(id:string,standardAssets:readonly StandardAsset[],registry:Fixed140Registry) {
  if(standardAssets.some(asset=>asset.fabricId===id))return null;
  const assignment=registry.assignments[id];
  return registry.version===1&&validFixed140Assignment(id,assignment)?assignment:null;
}
