const ACCESS_TOKEN_KEY = "final2_access_token";
const ROLE_KEY = "final2_role";
const ACCESS_COOKIE = "final2_access_token";
const ROLE_COOKIE = "final2_role";

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function clearCookie(name: string) {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:";
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function getCookie(name: string) {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSession(token: string, role: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.localStorage.setItem(ROLE_KEY, role);
  setCookie(ACCESS_COOKIE, token, 60 * 60 * 4);
  setCookie(ROLE_COOKIE, role, 60 * 60 * 4);
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  setCookie(ACCESS_COOKIE, token, 60 * 60 * 4);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return getCookie(ACCESS_COOKIE) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getSessionRole() {
  if (typeof window === "undefined") return null;
  return getCookie(ROLE_COOKIE) ?? window.localStorage.getItem(ROLE_KEY);
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  clearCookie(ACCESS_COOKIE);
  clearCookie(ROLE_COOKIE);
}
