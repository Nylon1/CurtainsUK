import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { newDiscoveryCheckpoint, recordDiscoveryObservation, discoverySummary, type DiscoveryIdentity, type RouteObservation } from "../lib/fabric-master/portal-discovery";
import { portalDiscoveryPlan, PORTAL_MAP_VERSION } from "../lib/fabric-master/portal-discovery-maps";

/** Sanitised UI observations in; resumable ordered work queue out. No login data. */
async function main() {
  const arg = (name:string) => process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
  const input = arg("input");
  if (!input) throw new Error("DISCOVERY_INPUT_REQUIRED");
  const limit = Number(arg("batch-size") ?? 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) throw new Error("DISCOVERY_BATCH_INVALID");
  const rows = JSON.parse(await readFile(resolve(input),"utf8")) as {identity:DiscoveryIdentity;observations?:RouteObservation[]}[];
  if (!Array.isArray(rows)) throw new Error("DISCOVERY_INPUT_INVALID");
  const root = resolve("artifacts/phase5f/checkpoints"); await mkdir(root,{recursive:true});
  const reports = [];
  for (const row of rows.slice(0,limit)) {
    const fresh = newDiscoveryCheckpoint(row.identity,PORTAL_MAP_VERSION);
    let checkpoint = fresh;
    const path = resolve(root,`discovery-${fresh.fabricId}.json`);
    try {
      const prior = JSON.parse(await readFile(path,"utf8"));
      if (prior.identityKey === fresh.identityKey && prior.mapVersion === fresh.mapVersion) {
        for (const o of prior.observations) checkpoint = recordDiscoveryObservation(checkpoint,o);
      }
    } catch(e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("DISCOVERY_CHECKPOINT_INVALID"); }
    for (const o of row.observations ?? []) checkpoint = recordDiscoveryObservation(checkpoint,o);
    await writeFile(path+".tmp",JSON.stringify(checkpoint,null,2));await rename(path+".tmp",path);
    const summary = discoverySummary(checkpoint);
    reports.push({fabricId:checkpoint.fabricId,...summary,plan:portalDiscoveryPlan(row.identity.supplier,summary.remainingRoutes)});
  }
  const output = {mapVersion:PORTAL_MAP_VERSION,processed:reports.length,remaining:Math.max(0,rows.length-limit),genuinelyMissing:reports.filter(r=>r.genuinelyMissing).length,reports};
  await writeFile(resolve(root,"discovery-plan.json"),JSON.stringify(output,null,2));
  console.log(JSON.stringify({mapVersion:output.mapVersion,processed:output.processed,remaining:output.remaining,genuinelyMissing:output.genuinelyMissing,statuses:reports.map(({fabricId,status,remainingRoutes})=>({fabricId,status,remainingRoutes}))}));
}
main().catch(()=>{console.error("DISCOVERY_PLAN_FAILED");process.exitCode=1;});
