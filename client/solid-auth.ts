import {
  ReactiveFetchManager,
} from "@solid/reactive-authentication";
import type { AuthorizationCodeFlow } from "@solid/reactive-authentication";
import * as BrowserBuffer from "buffer";
import * as BrowserEvents from "events";
import { WebIdDPoPTokenProvider } from "./webid-token-provider.ts";
import { validateWebId } from "./login-ux.ts";

void BrowserBuffer;
void BrowserEvents;

const WEBID_KEY = "comidas.gratis.webid";
const STATIC_CLIENT_ID =
  "https://raw.githubusercontent.com/comidasgratis/comidas.gratis/main/public/client-id.jsonld";
let _initialized = false;

export function setupAuth(getWebId: () => string): void {
  if (_initialized) return;

  const ui = document.querySelector<AuthorizationCodeFlow>(
    "authorization-code-flow",
  )!;
  const callbackUri = new URL("/callback.html", location.href).toString();

  const provider = new WebIdDPoPTokenProvider(
    callbackUri,
    ui.getCode.bind(ui),
    async () => validateWebId(getWebId()),
    { allowInsecureLoopback: true, clientId: STATIC_CLIENT_ID },
  );

  const manager = new ReactiveFetchManager([provider]);
  manager.registerGlobally();
  _initialized = true;
}

export function getStoredWebId(): string | null {
  return localStorage.getItem(WEBID_KEY);
}

export function setStoredWebId(webId: string): void {
  localStorage.setItem(WEBID_KEY, webId);
}

export function clearStoredWebId(): void {
  localStorage.removeItem(WEBID_KEY);
}
