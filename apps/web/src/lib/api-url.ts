/**
 * The API URL, used by the REST client, the session-bootstrap refresh call,
 * and the notifications socket alike.
 *
 * `VITE_API_URL` wins when set (real deployments always set it to a real
 * domain). Otherwise — plain local dev — it's derived from whatever host the
 * page was actually loaded through rather than hardcoded to `localhost`, so
 * the same build works unmodified whether opened as `localhost:5173` or from
 * another device on the LAN via the dev machine's IP (`192.168.x.x:5173`):
 * `localhost` in a phone's browser would otherwise resolve to the phone
 * itself, not the dev machine, and every request would fail outright.
 */
export const API_URL =
  import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
