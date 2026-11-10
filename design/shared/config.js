// Online services for the design apps. Keep AI_READY equal to lib/backend.ts (a test checks it).
const LIVE_API = "https://asaandesk-api.asaandesk.workers.dev";
// Automated local checks may point the apps at a local copy of the Worker: ?api=http://127.0.0.1:8790 (only on localhost).
const local = /^(127\.0\.0\.1|localhost)$/.test(globalThis.location?.hostname || "");
const override = local ? new URLSearchParams(globalThis.location?.search || "").get("api") : null;
export const API = override && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(override) ? override : LIVE_API;
export const AI_READY = false;
// Local test hook only (never on the live site): automated checks can switch the online AI path on.
export const aiReady = () => AI_READY || (local && globalThis.ASAANDESK_AI_READY_OVERRIDE === true);
