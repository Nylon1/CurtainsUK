import assert from 'node:assert/strict';

const alias = process.env.CURTAINSUK_GATEWAY_ALIAS ?? 'curtainsuk-staging-gateway.vercel.app';
const expectedDeployment = process.env.CURTAINSUK_GATEWAY_DEPLOYMENT_ID ?? '';
const expectedCommit = process.env.GITHUB_SHA ?? '';
const token = process.env.VERCEL_TOKEN ?? '';

assert.match(alias, /^[a-z0-9-]+\.vercel\.app$/);
assert.match(expectedDeployment, /^dpl_[A-Za-z0-9]+$/,
  'CURTAINSUK_GATEWAY_DEPLOYMENT_ID must name the deployment admitted to live smoke');
assert.match(expectedCommit, /^[a-f0-9]{40}$/,
  'GITHUB_SHA must identify the released production lineage');
assert.ok(token.length > 20, 'VERCEL_TOKEN is required for the deployment-identity release check');

const headers = { Authorization: `Bearer ${token}` };
const aliasResponse = await fetch(`https://api.vercel.com/v4/aliases/${alias}`, { headers });
assert.equal(aliasResponse.status, 200, 'gateway alias could not be resolved');
const aliasRecord = await aliasResponse.json();
assert.equal(aliasRecord.deploymentId, expectedDeployment,
  `gateway alias must resolve to the deployment admitted to smoke (received ${aliasRecord.deploymentId ?? 'none'})`);

const deploymentResponse = await fetch(`https://api.vercel.com/v13/deployments/${expectedDeployment}`, { headers });
assert.equal(deploymentResponse.status, 200, 'gateway deployment could not be inspected');
const deployment = await deploymentResponse.json();
assert.equal(deployment.target, 'production', 'gateway deployment must be a production deployment');
assert.equal(deployment.meta?.githubCommitSha, expectedCommit,
  'gateway deployment source must equal the release/production HEAD under validation');

console.log(JSON.stringify({
  status: 'PASS',
  alias,
  deploymentId: expectedDeployment,
  commit: expectedCommit,
}, null, 2));
