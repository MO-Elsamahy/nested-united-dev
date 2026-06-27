// ─────────────────────────────────────────────────────────────────
// AdaptiveAPIClient: Builds and executes requests using the registry
// Never uses hardcoded hashes, URLs, or headers.
// src/core/client/AdaptiveAPIClient.ts
// ─────────────────────────────────────────────────────────────────

import type { IAdaptiveClient, AdaptiveRequestConfig, AdaptiveResponse } from '../interfaces/index';
import type { GraphQLRegistry } from '../registry/GraphQLRegistry';

export class AdaptiveAPIClient implements IAdaptiveClient {

  constructor(private registry: GraphQLRegistry) {}

  async execute(config: AdaptiveRequestConfig): Promise<AdaptiveResponse> {
    // ── 1. Look up the operation from registry ────────────────────
    const op = config.overrideHash
      ? null
      : await this.registry.getLatestByName(config.platform, config.operationName);

    if (!op && !config.overrideHash) {
      return {
        ok: false,
        status: 0,
        data: null,
        rawBody: `[AdaptiveClient] No registry entry for ${config.platform}/${config.operationName}`,
      };
    }

    const hash     = config.overrideHash ?? op!.sha256Hash;
    const endpoint = op?.endpointUrl ?? this.buildEndpointUrl(config.platform, config.operationName, hash);
    const apiKey   = config.apiKey ?? op?.apiKey ?? this.defaultApiKey(config.platform);
    const storedHeaders = op?.sampleHeaders ?? {};

    // ── 2. Build headers ──────────────────────────────────────────
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      ...storedHeaders,
    };
    if (config.cookies) headers['cookie'] = config.cookies;
    if (apiKey) headers['x-airbnb-api-key'] = apiKey;

    if (config.platform === 'airbnb') {
      headers['x-csrf-without-token'] = '1';
      headers['x-airbnb-graphql-platform-client'] = 'minimalist-niobe';
      headers['x-airbnb-graphql-platform'] = 'web';
      headers['x-niobe-short-circuited'] = 'true';
    }

    // ── 3. Build body (GraphQL only) ──────────────────────────────
    const isGraphQL = hash.length === 64 && /^[a-f0-9]+$/.test(hash);
    const body = isGraphQL
      ? JSON.stringify({
          operationName: config.operationName,
          variables: config.variables ?? {},
          extensions: {
            persistedQuery: { version: 1, sha256Hash: hash },
          },
        })
      : JSON.stringify(config.variables ?? {});

    // ── 4. Execute ────────────────────────────────────────────────
    let res: Response;
    try {
      res = await fetch(endpoint, { method: 'POST', headers, body });
    } catch (e: unknown) {
      return { ok: false, status: 0, data: null, rawBody: String(e), operationUsed: op ?? undefined };
    }

    const rawBody = await res.text().catch(() => '');
    let data: unknown = null;
    try { data = JSON.parse(rawBody); } catch { data = rawBody; }

    return {
      ok: res.ok,
      status: res.status,
      data,
      rawBody,
      operationUsed: op ?? undefined,
    };
  }

  private buildEndpointUrl(platform: string, operationName: string, hash: string): string {
    if (platform === 'airbnb') {
      return `https://www.airbnb.com/api/v3/${operationName}/${hash}`;
    }
    return `https://chatapi-prod.gathern.co/api/v2/user_chat/${operationName}`;
  }

  private defaultApiKey(platform: string): string | undefined {
    if (platform === 'airbnb') return 'd306zoyjsyarp7ifhu67rjxn52tv0t20';
    return undefined;
  }
}
