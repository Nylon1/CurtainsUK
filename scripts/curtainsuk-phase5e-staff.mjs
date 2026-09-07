import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');
const url = process.env.SUPABASE_URL;
if (url !== 'https://hqysjumypgeapgmqkcrx.supabase.co') throw new Error('STAGING_PROJECT_REQUIRED');
const client = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const credentialsPath = '.env.phase5e-staff';
const email = 'phase5e-reviewer@curtainsuk.invalid';
if (existsSync(credentialsPath)) {
  loadEnvFile(credentialsPath);
} else {
  const { data: listed, error: listError } = await client.auth.admin.listUsers();
  if (listError) throw new Error('STAFF_LOOKUP_FAILED');
  if (listed.users.some(user => user.email === email)) throw new Error('EXISTING_STAFF_CREDENTIAL_REQUIRED');
  const password = randomBytes(36).toString('base64url');
  const { data, error } = await client.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { roles: ['CURTAINSUK_STAGING_REVIEWER'], curtainsuk_environment: 'STAGING' },
  });
  if (error || !data.user) throw new Error('STAFF_CREATION_FAILED');
  writeFileSync(credentialsPath, `PHASE5E_STAFF_EMAIL=${email}\nPHASE5E_STAFF_PASSWORD=${password}\nPHASE5E_STAFF_ID=${data.user.id}\n`, { flag: 'wx', mode: 0o600 });
  loadEnvFile(credentialsPath);
}
const { data, error } = await client.auth.signInWithPassword({ email, password: process.env.PHASE5E_STAFF_PASSWORD });
if (error || !data.user) throw new Error('STAFF_SIGNIN_FAILED');
if (JSON.stringify(data.user.app_metadata.roles) !== JSON.stringify(['CURTAINSUK_STAGING_REVIEWER'])) throw new Error('STAFF_ROLE_MISMATCH');
console.log(JSON.stringify({ staffId: data.user.id, environment: data.user.app_metadata.curtainsuk_environment, roles: data.user.app_metadata.roles, signIn: 'PASS', credentials: 'Ignored local file; never printed' }));
await client.auth.signOut();
