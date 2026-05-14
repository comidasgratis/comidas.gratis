import { uuid } from "../utils/uuid.js";

/**
 * Generate an ES256 key pair for DPoP
 * @returns {Promise<{privateKey: CryptoKey, publicKey: CryptoKey, publicJwk: object}>}
 */
export async function generateDpopKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true, // extractable (need to export public key)
    ["sign", "verify"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  // Remove private key fields from the JWK for the public version
  delete publicJwk.d;
  delete publicJwk.key_ops;
  delete publicJwk.ext;
  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicJwk
  };
}

/**
 * Create a DPoP proof JWT (RFC 9449)
 * @param {CryptoKey} privateKey - ES256 private key
 * @param {object} publicJwk - Public key as JWK (no private material)
 * @param {string} method - HTTP method (e.g., "POST", "GET")
 * @param {string} url - Target URL
 * @param {string} [accessToken] - Optional access token for ath claim
 * @returns {Promise<string>} DPoP proof JWT
 */
export async function createDpopProof(privateKey, publicJwk, method, url, accessToken) {
  const header = {
    typ: "dpop+jwt",
    alg: "ES256",
    jwk: publicJwk
  };

  const claims = {
    htm: method,
    htu: url,
    iat: Math.floor(Date.now() / 1000),
    jti: uuid()
  };

  // If access token provided, add ath (access token hash)
  if (accessToken) {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(accessToken));
    claims.ath = base64UrlEncode(new Uint8Array(hash));
  }

  return signJwt(header, claims, privateKey);
}

/**
 * Sign a JWT with ES256
 * @param {object} header
 * @param {object} claims
 * @param {CryptoKey} privateKey
 * @returns {Promise<string>} Signed JWT
 */
export async function signJwt(header, claims, privateKey) {
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const claimsB64 = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${claimsB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(signingInput)
  );

  // Convert DER signature to raw r||s format expected by JWT
  const sigBytes = new Uint8Array(signature);
  const sigB64 = base64UrlEncode(sigBytes);

  return `${signingInput}.${sigB64}`;
}

/**
 * Decode a JWT without verification (for reading claims)
 * @param {string} jwt
 * @returns {{header: object, claims: object}}
 */
export function decodeJwt(jwt) {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    claims: JSON.parse(base64UrlDecode(parts[1]))
  };
}

/**
 * Base64 URL encode
 */
export function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Base64 URL decode to string
 */
export function base64UrlDecode(str) {
  const padded = str + "=".repeat((4 - str.length % 4) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
