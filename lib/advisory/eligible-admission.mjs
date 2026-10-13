import {fail} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

// Operator evidence, never customer/model input. No credential values belong here.
export function checkEligiblePrerequisites(evidence, historical, now=Date.now()) {
 const age=now-Date.parse(evidence?.observedAt), b=evidence?.backup;
 if(evidence?.projectRef!==EXISTING_PROJECT_REF||!Number.isFinite(age)||age<0||age>60000)fail('FRESH_PREREQUISITES_REQUIRED',503);
 const completed=Date.parse(b?.completedAt), previous=Date.parse(historical?.job?.updated_at);
 if(b?.recoverable!==true||!b.reference||!b.recoveryOperator||!Number.isFinite(completed)||!Number.isFinite(previous)||completed<=previous||completed>now||!Number.isSafeInteger(b.acceptedRpoSeconds)||b.acceptedRpoSeconds<1||now-completed>b.acceptedRpoSeconds*1000)fail('POST_WRITE_RECOVERABLE_BACKUP_REQUIRED',503);
 if(evidence.operatorAccess?.verified!==true||evidence.operatorAccess.exposedCredentialsRetired!==true||!evidence.operatorAccess.reference)fail('SECURE_OPERATOR_ACCESS_REQUIRED',503);
 return {checkedAt:now,backupReference:b.reference};
}
