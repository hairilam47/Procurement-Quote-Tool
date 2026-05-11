import Stripe from 'stripe';
import { StripeSync } from 'stripe-replit-sync';

interface Credentials { publishableKey: string; secretKey: string }

// In-memory credential cache keyed by environment.
// Stripe API keys never rotate mid-session, so a 60-second TTL eliminates
// the external HTTP round-trip on every Stripe API call (~500-1000ms saved).
const credentialCache: Record<string, { value: Credentials; expiresAt: number }> = {};
const CACHE_TTL_MS = 60_000;

async function getCredentials(): Promise<Credentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      'Missing Replit environment variables. ' +
      'Ensure the Stripe integration is connected via the Integrations tab.'
    );
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  // Return cached credentials if still fresh
  const cached = credentialCache[targetEnvironment];
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'X-Replit-Token': xReplitToken,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${response.status} ${response.statusText}`);
  }

  interface ConnectorResponse {
    items?: Array<{ settings?: { secret?: string; publishable?: string } }>;
  }
  const data = await response.json() as ConnectorResponse;
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret || !settings?.publishable) {
    throw new Error(
      `Stripe ${targetEnvironment} connection not found. ` +
      'Connect Stripe via the Integrations tab first.'
    );
  }

  const credentials: Credentials = {
    publishableKey: settings.publishable,
    secretKey: settings.secret,
  };

  credentialCache[targetEnvironment] = {
    value: credentials,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return credentials;
}

export async function getStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

// Keep legacy name as alias so any external callers aren't broken
export const getUncachableStripeClient = getStripeClient;

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const { secretKey } = await getCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 2 },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: '',
  });
}
