// Exact Git tree audit with the published visualiser bytes as the sole exception.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {verifyReleasedVisualiserAssets} from './verify-released-visualiser-assets.mjs';

const blobHash=data=>createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
const sha256=data=>createHash('sha256').update(data).digest('hex');
const git=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024});
const inExport=(root,name)=>{
  const path=resolve(root,name);
  assert.ok(path.startsWith(root+sep),'Invalid export path: '+name);
  return path;
};
const lineEndings=(data,toCrLf)=>Buffer.from(data.toString('latin1').replace(toCrLf?/(?<!\r)\n/g:/\r\n/g,toCrLf?'\r\n':'\n'),'latin1');
async function walk(root,directory=root){
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=resolve(directory,entry.name);
    if(entry.isDirectory())files.push(...await walk(root,path));
    else if(entry.isFile())files.push(relative(root,path).split(sep).join('/'));
    else throw Error('Unexpected export entry: '+path);
  }
  return files;
}

export async function auditProductionExport(output,{repair=false,allowVercelLink=false}={}){
  const root=resolve(output);
  const head=git('rev-parse','HEAD').toString().trim();
  const tree=git('rev-parse','HEAD^{tree}').toString().trim();
  const manifest=JSON.parse(await readFile(inExport(root,'lib/room-visualiser/released-assets.json'),'utf8'));
  const published=new Map();
  for(const pack of manifest.packs)for(const file of pack.files){
    const name='public'+pack.assetBase+file.path;
    inExport(root,name);
    published.set(name,file.sha256);
  }
  const raw=git('ls-tree','-rz',head).toString().split('\0').filter(Boolean);
  const expected=new Set(),exceptions=[];
  const digest=createHash('sha256');
  let bytes=0,normalizedFiles=0;
  for(const line of raw){
    const match=/^(\d+) (\w+) ([a-f0-9]{40})\t(.+)$/.exec(line);
    assert.ok(match,'Invalid Git tree entry: '+line);
    const [,mode,type,expectedBlob,name]=match;
    assert.equal(type,'blob','Unsupported Git tree entry: '+name);
    assert.equal(mode,'100644','Unsupported Git file mode: '+name);
    expected.add(name);
    const path=inExport(root,name);
    let data=await readFile(path);
    let actual=blobHash(data);
    if(repair&&actual!==expectedBlob){
      const normalized=lineEndings(data,false);
      if(blobHash(normalized)===expectedBlob){
        data=normalized;actual=expectedBlob;
        await writeFile(path,data);
        normalizedFiles++;
      }
    }
    const publishedHash=published.get(name);
    if(repair&&publishedHash&&actual===expectedBlob&&sha256(data)!==publishedHash){
      const candidate=lineEndings(data,true);
      if(sha256(candidate)===publishedHash){
        data=candidate;actual=blobHash(data);
        await writeFile(path,data);
      }
    }
    if(actual!==expectedBlob){
      assert.ok(publishedHash,'Unapproved Git blob mismatch: '+name);
      assert.equal(sha256(data),publishedHash,'Published asset hash mismatch: '+name);
      assert.equal(blobHash(lineEndings(data,false)),expectedBlob,'Published bytes differ beyond line endings: '+name);
      exceptions.push(name);
    }else if(publishedHash)assert.equal(sha256(data),publishedHash,'Protected asset hash mismatch: '+name);
    bytes+=data.length;
    digest.update(name+'\0'+sha256(data)+'\n');
  }
  for(const name of await walk(root)){
    if(expected.has(name))continue;
    if(allowVercelLink&&['.vercel/project.json','.vercel/README.txt'].includes(name))continue;
    throw Error('Unexpected file in source export: '+name);
  }
  const protectedAssetGuard=await verifyReleasedVisualiserAssets(root);
  return {sourceCommit:head,sourceTree:tree,trackedFiles:raw.length,trackedBytes:bytes,normalizedFiles,publishedLineEndingExceptions:exceptions,contentDigest:digest.digest('hex'),protectedAssetGuard};
}
