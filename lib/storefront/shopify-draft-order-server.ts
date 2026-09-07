import "server-only";
import { createHash } from "node:crypto";
import {
  assertShopifyDraftOrderFinancials,
  buildShopifyDraftOrderContract,
  SHOPIFY_DRAFT_ORDER_API_VERSION,
  SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES,
  type ShopifyDraftOrderContract,
  type ShopifyDraftOrderFinancialNode,
  type ShopifyDraftOrderMode,
  type ShopifyDraftOrderNode,
  validateShopifyDraftOrderNode,
} from "./shopify-draft-order-core";
import type { StagingCheckoutHandoff } from "./checkout-gates";

export interface ShopifyDraftOrderRuntimeConfig {
  mode: ShopifyDraftOrderMode;
  deploymentStage: "STAGING";
  shopDomain: string;
  clientId: string;
  clientSecret: string;
  realPaymentsDisabledConfirmed: boolean;
  requestTimeoutMs: number;
}

export type ShopifyDraftOrderExecutionResult = {
  status: "DISABLED";
  shopifyWritePerformed: false;
  checkoutUrl: null;
  draftOrderId: null;
  draftOrderName: null;
  paymentEnabled: false;
} | {
  status: "CALCULATED";
  shopifyWritePerformed: false;
  checkoutUrl: null;
  draftOrderId: null;
  draftOrderName: null;
  paymentEnabled: false;
} | {
  status: "TEST_DRAFT_CREATED" | "EXISTING_TEST_DRAFT_REUSED";
  shopifyWritePerformed: boolean;
  checkoutUrl: string;
  draftOrderId: string;
  draftOrderName: string;
  paymentEnabled: false;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type GraphqlEnvelope = {
  data?: Record<string, unknown> | null;
  errors?: unknown;
};

type ClientCredentialsToken = {
  accessToken: string;
  expiresAtMs: number;
  grantedScopes: ReadonlySet<string>;
};

const PHASE5D_ALLOWED_CHECKOUT_STORE = "curtainsuk-dev.myshopify.com";
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1_000;
let cachedClientCredentialsToken: (ClientCredentialsToken & { cacheKey: string }) | null = null;

const FINANCIAL_FIELDS = `
  taxesIncluded
  presentmentCurrencyCode
  totalLineItemsPriceSet { presentmentMoney { amount currencyCode } }
  subtotalPriceSet { presentmentMoney { amount currencyCode } }
  totalShippingPriceSet { presentmentMoney { amount currencyCode } }
  totalTaxSet { presentmentMoney { amount currencyCode } }
  totalDiscountsSet { presentmentMoney { amount currencyCode } }
  totalPriceSet { presentmentMoney { amount currencyCode } }
`;

export const SHOPIFY_DRAFT_ORDER_CALCULATE_MUTATION = `
  mutation CurtainsUKCalculateDraftOrder($input: DraftOrderInput!) {
    draftOrderCalculate(input: $input) {
      calculatedDraftOrder {
        ${FINANCIAL_FIELDS}
        warnings { errorCode field message }
      }
      userErrors { field message }
    }
  }
`;

export const SHOPIFY_DRAFT_ORDER_LOOKUP_QUERY = `
  query CurtainsUKFindDraftOrder($query: String!) {
    draftOrders(first: 2, query: $query, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        name
        invoiceUrl
        status
        tags
        customAttributes { key value }
        ${FINANCIAL_FIELDS}
      }
    }
  }
`;

export const SHOPIFY_DRAFT_ORDER_CREATE_MUTATION = `
  mutation CurtainsUKCreateDraftOrder($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        invoiceUrl
        status
        tags
        customAttributes { key value }
        ${FINANCIAL_FIELDS}
      }
      userErrors { field message }
    }
  }
`;

export const SHOPIFY_ACCESS_SCOPE_QUERY = `
  query CurtainsUKGrantedAccessScopes {
    currentAppInstallation {
      accessScopes { handle }
    }
  }
`;

function parseMode(value: string | undefined): ShopifyDraftOrderMode {
  if (!value || value === "DISABLED") return "DISABLED";
  if (value === "CALCULATE_ONLY" || value === "CREATE_TEST_DRAFT") return value;
  throw new Error("SHOPIFY_DRAFT_ORDER_MODE_INVALID");
}

function validShopDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value);
}

export function shopifyDraftOrderConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ShopifyDraftOrderRuntimeConfig | null {
  const mode = parseMode(environment.CURTAINSUK_SHOPIFY_DRAFT_ORDER_MODE);
  if (mode === "DISABLED") return null;
  if (environment.CURTAINSUK_DEPLOYMENT_STAGE !== "STAGING") {
    throw new Error("SHOPIFY_DRAFT_ORDER_NON_STAGING_DENIED");
  }
  const shopDomain = environment.CURTAINSUK_SHOPIFY_CHECKOUT_STORE?.trim().toLowerCase() ?? "";
  const clientId = environment.CURTAINSUK_SHOPIFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = environment.CURTAINSUK_SHOPIFY_APP_SECRET?.trim() ?? "";
  if (!validShopDomain(shopDomain) || shopDomain !== PHASE5D_ALLOWED_CHECKOUT_STORE) {
    throw new Error("SHOPIFY_DRAFT_ORDER_CHECKOUT_STORE_DENIED");
  }
  if (clientId.length < 8 || clientSecret.length < 16) {
    throw new Error("SHOPIFY_DRAFT_ORDER_CREDENTIALS_MISSING");
  }
  const realPaymentsDisabledConfirmed = environment.CURTAINSUK_SHOPIFY_REAL_PAYMENTS_DISABLED_CONFIRMED === "true";
  if (mode === "CREATE_TEST_DRAFT" && !realPaymentsDisabledConfirmed) {
    throw new Error("SHOPIFY_DRAFT_ORDER_PAYMENT_SAFETY_NOT_CONFIRMED");
  }
  return {
    mode,
    deploymentStage: "STAGING",
    shopDomain,
    clientId,
    clientSecret,
    realPaymentsDisabledConfirmed,
    requestTimeoutMs: 10_000,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function userErrors(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function graphql(input: {
  config: ShopifyDraftOrderRuntimeConfig;
  accessToken: string;
  query: string;
  variables: Record<string, unknown>;
  fetchImpl: FetchLike;
}): Promise<Record<string, unknown>> {
  const endpoint = `https://${input.config.shopDomain}/admin/api/${SHOPIFY_DRAFT_ORDER_API_VERSION}/graphql.json`;
  let response: Response;
  try {
    response = await input.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": input.accessToken,
      },
      body: JSON.stringify({ query: input.query, variables: input.variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(input.config.requestTimeoutMs),
    });
  } catch {
    throw new Error("SHOPIFY_ADMIN_REQUEST_FAILED");
  }
  if (!response.ok) throw new Error("SHOPIFY_ADMIN_REQUEST_FAILED");
  let envelope: GraphqlEnvelope;
  try {
    envelope = await response.json() as GraphqlEnvelope;
  } catch {
    throw new Error("SHOPIFY_ADMIN_RESPONSE_INVALID");
  }
  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
    throw new Error("SHOPIFY_ADMIN_GRAPHQL_ERROR");
  }
  if (!isRecord(envelope.data)) throw new Error("SHOPIFY_ADMIN_RESPONSE_INVALID");
  return envelope.data;
}

function parseGrantedScopes(value: unknown): ReadonlySet<string> {
  if (typeof value !== "string") throw new Error("SHOPIFY_ADMIN_TOKEN_RESPONSE_INVALID");
  return new Set(value.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean));
}

function assertRequiredScopes(scopes: ReadonlySet<string>): void {
  if (SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES.some((scope) => !scopes.has(scope))) {
    throw new Error("SHOPIFY_DRAFT_ORDER_SCOPE_MISSING");
  }
}

async function exchangeClientCredentials(input: {
  config: ShopifyDraftOrderRuntimeConfig;
  fetchImpl: FetchLike;
}): Promise<ClientCredentialsToken> {
  const tokenEndpoint = `https://${input.config.shopDomain}/admin/oauth/access_token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
  });
  let response: Response;
  try {
    response = await input.fetchImpl(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(input.config.requestTimeoutMs),
    });
  } catch {
    throw new Error("SHOPIFY_ADMIN_TOKEN_REQUEST_FAILED");
  }
  if (!response.ok) throw new Error("SHOPIFY_ADMIN_TOKEN_REQUEST_FAILED");
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("SHOPIFY_ADMIN_TOKEN_RESPONSE_INVALID");
  }
  if (!isRecord(value)
      || typeof value.access_token !== "string"
      || value.access_token.length < 16
      || !Number.isInteger(value.expires_in)
      || Number(value.expires_in) < 60
      || Number(value.expires_in) > 172_800) {
    throw new Error("SHOPIFY_ADMIN_TOKEN_RESPONSE_INVALID");
  }
  const grantedScopes = parseGrantedScopes(value.scope);
  assertRequiredScopes(grantedScopes);
  return {
    accessToken: value.access_token,
    expiresAtMs: Date.now() + Number(value.expires_in) * 1_000,
    grantedScopes,
  };
}

async function verifyInstalledScopes(input: {
  config: ShopifyDraftOrderRuntimeConfig;
  accessToken: string;
  fetchImpl: FetchLike;
}): Promise<void> {
  const data = await graphql({
    config: input.config,
    accessToken: input.accessToken,
    query: SHOPIFY_ACCESS_SCOPE_QUERY,
    variables: {},
    fetchImpl: input.fetchImpl,
  });
  const installation = data.currentAppInstallation;
  if (!isRecord(installation) || !Array.isArray(installation.accessScopes)) {
    throw new Error("SHOPIFY_DRAFT_ORDER_SCOPE_RESPONSE_INVALID");
  }
  const scopes = new Set(installation.accessScopes.flatMap((scope) => (
    isRecord(scope) && typeof scope.handle === "string" ? [scope.handle] : []
  )));
  assertRequiredScopes(scopes);
}

async function clientCredentialsToken(input: {
  config: ShopifyDraftOrderRuntimeConfig;
  fetchImpl: FetchLike;
}): Promise<string> {
  const secretFingerprint = createHash("sha256")
    .update(input.config.clientSecret)
    .digest("hex");
  const cacheKey = `${input.config.shopDomain}:${input.config.clientId}:${secretFingerprint}`;
  if (cachedClientCredentialsToken?.cacheKey === cacheKey
      && cachedClientCredentialsToken.expiresAtMs - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    assertRequiredScopes(cachedClientCredentialsToken.grantedScopes);
    return cachedClientCredentialsToken.accessToken;
  }
  const exchanged = await exchangeClientCredentials(input);
  await verifyInstalledScopes({
    config: input.config,
    accessToken: exchanged.accessToken,
    fetchImpl: input.fetchImpl,
  });
  cachedClientCredentialsToken = { ...exchanged, cacheKey };
  return exchanged.accessToken;
}

async function calculate(input: {
  contract: ShopifyDraftOrderContract;
  config: ShopifyDraftOrderRuntimeConfig;
  accessToken: string;
  fetchImpl: FetchLike;
}): Promise<void> {
  const data = await graphql({
    config: input.config,
    accessToken: input.accessToken,
    query: SHOPIFY_DRAFT_ORDER_CALCULATE_MUTATION,
    variables: { input: input.contract.input },
    fetchImpl: input.fetchImpl,
  });
  const payload = data.draftOrderCalculate;
  if (!isRecord(payload) || userErrors(payload.userErrors).length > 0) {
    throw new Error("SHOPIFY_DRAFT_ORDER_REJECTED");
  }
  const calculated = payload.calculatedDraftOrder;
  if (!isRecord(calculated)) throw new Error("SHOPIFY_DRAFT_ORDER_CALCULATION_INVALID");
  if (userErrors(calculated.warnings).length > 0) {
    throw new Error("SHOPIFY_DRAFT_ORDER_CALCULATION_WARNING");
  }
  assertShopifyDraftOrderFinancials(
    calculated as ShopifyDraftOrderFinancialNode,
    input.contract.expected,
  );
}

async function findExisting(input: {
  contract: ShopifyDraftOrderContract;
  config: ShopifyDraftOrderRuntimeConfig;
  accessToken: string;
  fetchImpl: FetchLike;
}) {
  const data = await graphql({
    config: input.config,
    accessToken: input.accessToken,
    query: SHOPIFY_DRAFT_ORDER_LOOKUP_QUERY,
    variables: { query: `tag:${input.contract.idempotencyTag}` },
    fetchImpl: input.fetchImpl,
  });
  const connection = data.draftOrders;
  if (!isRecord(connection) || !Array.isArray(connection.nodes)) {
    throw new Error("SHOPIFY_DRAFT_ORDER_LOOKUP_INVALID");
  }
  if (connection.nodes.length > 1) throw new Error("SHOPIFY_DRAFT_ORDER_DUPLICATE");
  if (connection.nodes.length === 0) return null;
  if (!isRecord(connection.nodes[0])) throw new Error("SHOPIFY_DRAFT_ORDER_LOOKUP_INVALID");
  return validateShopifyDraftOrderNode(
    connection.nodes[0] as ShopifyDraftOrderNode,
    input.contract,
  );
}

async function create(input: {
  contract: ShopifyDraftOrderContract;
  config: ShopifyDraftOrderRuntimeConfig;
  accessToken: string;
  fetchImpl: FetchLike;
}) {
  const data = await graphql({
    config: input.config,
    accessToken: input.accessToken,
    query: SHOPIFY_DRAFT_ORDER_CREATE_MUTATION,
    variables: { input: input.contract.input },
    fetchImpl: input.fetchImpl,
  });
  const payload = data.draftOrderCreate;
  if (!isRecord(payload) || userErrors(payload.userErrors).length > 0) {
    throw new Error("SHOPIFY_DRAFT_ORDER_REJECTED");
  }
  if (!isRecord(payload.draftOrder)) throw new Error("SHOPIFY_DRAFT_ORDER_CREATE_INVALID");
  return validateShopifyDraftOrderNode(
    payload.draftOrder as ShopifyDraftOrderNode,
    input.contract,
  );
}

export async function executeShopifyDraftOrder(input: {
  contract: ShopifyDraftOrderContract;
  config: ShopifyDraftOrderRuntimeConfig | null;
  fetchImpl?: FetchLike;
}): Promise<ShopifyDraftOrderExecutionResult> {
  if (!input.config) {
    return {
      status: "DISABLED",
      shopifyWritePerformed: false,
      checkoutUrl: null,
      draftOrderId: null,
      draftOrderName: null,
      paymentEnabled: false,
    };
  }
  if (input.config.deploymentStage !== "STAGING") {
    throw new Error("SHOPIFY_DRAFT_ORDER_NON_STAGING_DENIED");
  }
  if (!validShopDomain(input.config.shopDomain)
      || input.config.shopDomain !== PHASE5D_ALLOWED_CHECKOUT_STORE) {
    throw new Error("SHOPIFY_DRAFT_ORDER_CHECKOUT_STORE_DENIED");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  if (input.config.mode === "CREATE_TEST_DRAFT"
      && !input.config.realPaymentsDisabledConfirmed) {
    throw new Error("SHOPIFY_DRAFT_ORDER_PAYMENT_SAFETY_NOT_CONFIRMED");
  }
  const accessToken = await clientCredentialsToken({ config: input.config, fetchImpl });
  if (input.config.mode === "CALCULATE_ONLY") {
    await calculate({ contract: input.contract, config: input.config, accessToken, fetchImpl });
    return {
      status: "CALCULATED",
      shopifyWritePerformed: false,
      checkoutUrl: null,
      draftOrderId: null,
      draftOrderName: null,
      paymentEnabled: false,
    };
  }
  if (input.config.mode !== "CREATE_TEST_DRAFT") {
    throw new Error("SHOPIFY_DRAFT_ORDER_PAYMENT_SAFETY_NOT_CONFIRMED");
  }
  const existing = await findExisting({ contract: input.contract, config: input.config, accessToken, fetchImpl });
  if (existing) {
    return {
      status: "EXISTING_TEST_DRAFT_REUSED",
      shopifyWritePerformed: false,
      checkoutUrl: existing.invoiceUrl,
      draftOrderId: existing.id,
      draftOrderName: existing.name,
      paymentEnabled: false,
    };
  }
  await calculate({ contract: input.contract, config: input.config, accessToken, fetchImpl });
  const created = await create({ contract: input.contract, config: input.config, accessToken, fetchImpl });
  return {
    status: "TEST_DRAFT_CREATED",
    shopifyWritePerformed: true,
    checkoutUrl: created.invoiceUrl,
    draftOrderId: created.id,
    draftOrderName: created.name,
    paymentEnabled: false,
  };
}

export async function executeStagingShopifyDraftOrder(input: {
  handoff: Readonly<StagingCheckoutHandoff>;
  customerEmail?: string | null;
  fabricLabel?: string | null;
  environment?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<ShopifyDraftOrderExecutionResult> {
  const contract = buildShopifyDraftOrderContract({
    handoff: input.handoff,
    customerEmail: input.customerEmail,
    fabricLabel: input.fabricLabel,
  });
  return executeShopifyDraftOrder({
    contract,
    config: shopifyDraftOrderConfigFromEnvironment(input.environment),
    fetchImpl: input.fetchImpl,
  });
}
