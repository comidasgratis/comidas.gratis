import { discoverOIDC, registerClient } from "./oidc-discovery.js";
import { generateDpopKeyPair, createDpopProof, decodeJwt, base64UrlEncode } from "./dpop.js";
import { uuid } from "../utils/uuid.js";

const SESSION_KEY = "solidAuth";
const CLIENT_KEY = "solidAuthClient";
const LAST_IDP_KEY = "solidLastIdp";

let currentSession = null;

export function getSessionInfo() {
  if (currentSession) {
    return { isLoggedIn: true, webId: currentSession.webId };
  }
  return { isLoggedIn: false, webId: null };
}

export async function solidLogin(issuer, redirectUrl, clientName = "comidas.gratis") {
  const config = await discoverOIDC(issuer);

  const appOrigin = new URL(redirectUrl).origin;
  const clientIdUrl = `${appOrigin}/client-id.jsonld`;

  const clientCacheKey = `${CLIENT_KEY}:${issuer}`;
  let client;
  try {
    const cached = localStorage.getItem(clientCacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed._redirectUrl === redirectUrl) {
        client = parsed;
      } else {
        localStorage.removeItem(clientCacheKey);
      }
    }
  } catch {}
  if (!client?.client_id) {
    client = await registerClient(config.registration_endpoint, clientName, [redirectUrl], {
      client_id: clientIdUrl,
      client_uri: appOrigin,
      scope: "openid webid profile"
    });
    client._redirectUrl = redirectUrl;
    localStorage.setItem(clientCacheKey, JSON.stringify(client));
  }

  const verifier = uuid() + uuid();
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(hash));

  const keys = await generateDpopKeyPair();
  const privateJwk = await crypto.subtle.exportKey("jwk", keys.privateKey);

  const state = uuid().replace(/-/g, "");
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    issuer,
    state,
    verifier,
    clientId: client.client_id,
    redirectUrl,
    tokenEndpoint: config.token_endpoint,
    endSessionEndpoint: config.end_session_endpoint || null,
    dpopPrivateJwk: privateJwk,
    dpopPublicJwk: keys.publicJwk
  }));

  const authUrl = new URL(config.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", client.client_id);
  authUrl.searchParams.set("redirect_uri", redirectUrl);
  authUrl.searchParams.set("scope", "openid webid profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  window.location.href = authUrl.toString();
}

export async function handleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state) {
    return restoreSession();
  }

  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, "", cleanUrl);

  const storedStr = sessionStorage.getItem(SESSION_KEY);
  if (!storedStr) {
    return restoreSession();
  }

  const stored = JSON.parse(storedStr);
  if (stored.state !== state) {
    sessionStorage.removeItem(SESSION_KEY);
    return restoreSession();
  }

  try {
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      stored.dpopPrivateJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const tokenResponse = await fetch(stored.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: stored.redirectUrl,
        client_id: stored.clientId,
        code_verifier: stored.verifier
      })
    });

    if (!tokenResponse.ok) {
      sessionStorage.removeItem(SESSION_KEY);
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(CLIENT_KEY)) localStorage.removeItem(key);
      }
      return restoreSession();
    }

    const tokens = await tokenResponse.json();
    const { claims } = decodeJwt(tokens.id_token);
    const webId = claims.webid || claims.sub;
    const tokenType = tokens.token_type || "Bearer";

    currentSession = {
      webId,
      accessToken: tokens.access_token,
      tokenType,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token || null,
      tokenEndpoint: stored.tokenEndpoint,
      endSessionEndpoint: stored.endSessionEndpoint,
      clientId: stored.clientId,
      issuer: stored.issuer,
      dpopPrivateJwk: stored.dpopPrivateJwk,
      dpopPublicJwk: stored.dpopPublicJwk
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
    localStorage.setItem(LAST_IDP_KEY, stored.issuer);
    sessionStorage.removeItem(SESSION_KEY);

    return { isLoggedIn: true, webId };
  } catch (err) {
    console.error("[auth] Token exchange error:", err);
    return { isLoggedIn: false, webId: null };
  }
}

function restoreSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return { isLoggedIn: false, webId: null };

  try {
    currentSession = JSON.parse(stored);
    return { isLoggedIn: true, webId: currentSession.webId };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return { isLoggedIn: false, webId: null };
  }
}

export async function solidLogoutUser() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  currentSession = null;
}

export function getAuthFetch() {
  return async function authFetch(url, options = {}) {
    if (!currentSession) return fetch(url, options);

    const method = (options.method || "GET").toUpperCase();
    const rawUrl = typeof url === "string" ? url : url.toString();
    const headers = new Headers(options.headers || {});

    if (currentSession.tokenType === "DPoP" && currentSession.dpopPrivateJwk) {
      try {
        const targetUrl = rawUrl.split("?")[0].split("#")[0];
        const privateKey = await crypto.subtle.importKey(
          "jwk",
          currentSession.dpopPrivateJwk,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["sign"]
        );
        const dpopProof = await createDpopProof(
          privateKey, currentSession.dpopPublicJwk, method, targetUrl,
          currentSession.accessToken
        );
        headers.set("Authorization", `DPoP ${currentSession.accessToken}`);
        headers.set("DPoP", dpopProof);
      } catch (err) {
        console.error("[auth] DPoP proof failed, falling back to Bearer:", err);
        headers.set("Authorization", `Bearer ${currentSession.accessToken}`);
      }
    } else {
      headers.set("Authorization", `Bearer ${currentSession.accessToken}`);
    }

    return fetch(url, { ...options, headers });
  };
}
