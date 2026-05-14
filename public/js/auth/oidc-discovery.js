/**
 * Fetch OIDC configuration from a Solid server
 * @param {string} issuer - The IdP URL (e.g., "https://paa.pub")
 * @param {function} [fetchFn] - Optional fetch function for testing
 * @returns {Promise<object>} OIDC configuration
 */
export async function discoverOIDC(issuer, fetchFn = globalThis.fetch) {
  const url = issuer.replace(/\/+$/, "") + "/.well-known/openid-configuration";
  const response = await fetchFn(url);
  if (!response.ok) throw new Error(`OIDC discovery failed: ${response.status}`);
  return response.json();
}

/**
 * Register a dynamic client with the OIDC provider
 * @param {string} registrationEndpoint
 * @param {string} clientName
 * @param {string[]} redirectUris
 * @param {function} [fetchFn]
 * @returns {Promise<{client_id: string}>}
 */
/**
 * @param {object} [metadata] - Extra client metadata (client_uri, logo_uri, scope, etc.)
 */
export async function registerClient(registrationEndpoint, clientName, redirectUris, metadata = {}, fetchFn = globalThis.fetch) {
  const response = await fetchFn(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
      ...metadata
    })
  });
  if (!response.ok) throw new Error(`Client registration failed: ${response.status}`);
  return response.json();
}
