import {fail} from './contracts.mjs';

export const JANE_RUNTIME_LOGIN = 'advisory_app_runtime_v1';
export const JANE_RETENTION_LOGIN = 'advisory_retention_runner_v1';
export const JANE_RETENTION_JOB = 'curtainsuk_jane_retention_v1';
export const JANE_RETENTION_SCHEDULE = '20 3 * * *';
// pg_cron connects as the job owner. On the existing Supabase project the
// dedicated login cannot connect from the cron worker, so the established
// postgres scheduler must drop to the narrow retention role in the job's
// transaction before it touches advisory rows.
export const JANE_RETENTION_COMMAND = "begin; set local role advisory_retention; do $$ begin if current_user <> 'advisory_retention' then raise exception 'retention role switch failed'; end if; end $$; select advisory.purge_expired(); commit;";
// Applied after the initial role provisioning for direct retention rehearsal.
export const JANE_RETENTION_LOGIN_GRANT = `grant advisory_retention to ${JANE_RETENTION_LOGIN} with inherit true, set true, admin false;`;
export const JANE_RETENTION_CRON_GRANT = 'grant advisory_retention to postgres with set true, inherit false;';
export const JANE_RETENTION_STOP_SQL = `select cron.unschedule(jobid) from cron.job where jobname='${JANE_RETENTION_JOB}';`;
const verifierPattern = /^SCRAM-SHA-256\$4096:[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=:[A-Za-z0-9+/]{43}=$/;

// Supply only SCRAM verifiers to the database. Plaintext passwords remain in
// the Windows-protected operator file and the server's sensitive environment.
export function permanentAccessSql({runtimeVerifier, retentionVerifier}) {
  if (!verifierPattern.test(runtimeVerifier ?? '') || !verifierPattern.test(retentionVerifier ?? '')
    || runtimeVerifier === retentionVerifier) fail('INVALID_PRODUCTION_PROVISIONING');
  return `begin;
set local lock_timeout='500ms';
set local statement_timeout='5s';
create role ${JANE_RUNTIME_LOGIN} login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 8 password '${runtimeVerifier}';
grant advisory_runtime to ${JANE_RUNTIME_LOGIN} with inherit false, set true, admin false;
alter role ${JANE_RUNTIME_LOGIN} set statement_timeout='3s';
alter role ${JANE_RUNTIME_LOGIN} set lock_timeout='500ms';
alter role ${JANE_RUNTIME_LOGIN} set idle_in_transaction_session_timeout='5s';
create role ${JANE_RETENTION_LOGIN} login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 1 password '${retentionVerifier}';
grant advisory_retention to ${JANE_RETENTION_LOGIN} with inherit false, set true, admin false;
alter role ${JANE_RETENTION_LOGIN} set statement_timeout='3s';
alter role ${JANE_RETENTION_LOGIN} set lock_timeout='500ms';
alter role ${JANE_RETENTION_LOGIN} set idle_in_transaction_session_timeout='5s';
commit;`;
}

export function disableProductionAccessSql() {
  return `begin;
set local lock_timeout='500ms';
alter role ${JANE_RUNTIME_LOGIN} nologin;
alter role ${JANE_RETENTION_LOGIN} nologin;
commit;`;
}

// Run only after all application connections have closed. Never CASCADE.
export function removeProductionAccessSql() {
  return `begin;
set local lock_timeout='500ms';
revoke advisory_runtime from ${JANE_RUNTIME_LOGIN};
revoke advisory_retention from ${JANE_RETENTION_LOGIN};
drop role ${JANE_RUNTIME_LOGIN};
drop role ${JANE_RETENTION_LOGIN};
commit;`;
}
