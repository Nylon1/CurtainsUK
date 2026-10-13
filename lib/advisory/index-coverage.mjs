import {fail,UUID} from './contracts.mjs';
import {knowledgeFields} from './index-worker.mjs';
// Operator report scans only this job's small derived receipts via the composite
// job_id index. It never counts/scans the canonical Master to invent a total.
export async function readIndexCoverage({query},jobId){
 if(!new RegExp(UUID).test(jobId))fail('INVALID_INPUT');
 const job=(await query('select source_snapshot,expected_count,processed,indexed,complete,status,batches,failures,last_error,updated_at from advisory.index_jobs where id=$1',[jobId])).rows[0];
 if(!job)fail('INDEX_JOB_NOT_APPROVED',403);
 const counts=(await query("select count(*)::int as observed,count(*) filter(where not rolled_back)::int as retained,count(*) filter(where not rolled_back and fields->>'_coverageVersion'='2')::int as reviewed_field_receipts,count(*) filter(where not rolled_back and (fields->>'_coverageVersion') is distinct from '2')::int as legacy_field_receipts from advisory.index_job_items where job_id=$1",[jobId])).rows[0];
 const fields=Object.fromEntries(Object.keys(knowledgeFields({})).map(k=>[k,0]));
 const rows=(await query("select f.key,count(*)::int as present from advisory.index_job_items i cross join lateral jsonb_each(i.fields) f where i.job_id=$1 and not i.rolled_back and i.fields->>'_coverageVersion'='2' and f.value='true'::jsonb group by f.key",[jobId])).rows;
 for(const r of rows)if(Object.hasOwn(fields,r.key))fields[r.key]=r.present;
 return {...job,...counts,fields,complete:job.complete&&job.status==='exhausted'&&counts.retained===job.expected_count,
   fieldCoverageComplete:counts.legacy_field_receipts===0,fieldCoverageScope:'Known values in version-2 receipts only; legacy presence flags excluded, not assumed false or silently rewritten',
   coverageScope:'Approved source manifest at its recorded version, not a guarantee of current Master state',purchaseEligibility:'Must be checked through the governed retail journey'};
}
