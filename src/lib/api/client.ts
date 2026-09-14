import type { ZodType } from "zod";

/**
 * The single place this app talks to the HydraaZone API.
 *
 * Everything here exists because of a verified server behaviour. See
 * `client/AGENTS.md` and the root `CLAUDE.md` for the full audit. The three
 * that bite hardest:
 *
 * 1. `Authorization` takes the RAW token. `server/src/app/middlewares/auth.ts`
 *    passes the header straight to `jwt.verify`, so a `Bearer ` prefix fails
 *    every protected request with "jwt malformed".
 * 2. There are four different success envelopes (see `unwrap`).
 * 3. Error bodies carry no `statusCode`, and some carry an EMPTY `message`
 *    (the server passes the human text as AppError's third `stack` argument).
 *    So user-facing copy is keyed off the HTTP status, with the server
 *    message used only when it is actually non-empty.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiErrorCode =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "validation"
  | "server"
  | "parse";

/** Fallback copy for when the server sends no usable message. */
const FALLBACK_MESSAGE: Record<ApiErrorCode, string> = {
  network: "Could not reach the server. Check your connection and try again.",
  timeout: "The server took too long to respond. Please try again.",
  unauthorized: "Your session has ended. Please log in again.",
  forbidden: "You do not have permission to do that.",
  not_found: "We could not find what you were looking for.",
  conflict: "That conflicts with something that already exists.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  validation: "Please check the details you entered and try again.",
  server: "Something went wrong on our side. Please try again.",
  parse: "We received an unexpected response from the server.",
};

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 422) return "validation";
  return "server";
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** The server's own message, when it sent a usable one. */
  readonly serverMessage: string | null;

  constructor(
    code: ApiErrorCode,
    status: number,
    serverMessage?: string | null,
  ) {
    const trimmed = serverMessage?.trim() || null;
    super(trimmed ?? FALLBACK_MESSAGE[code]);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.serverMessage = trimmed;
  }

  get isUnauthorized() {
    return this.code === "unauthorized";
  }

  /** A 409 from `/auth/guest-checkout` means "this email already has an account". */
  get isConflict() {
    return this.code === "conflict";
  }

  get isRateLimited() {
    return this.code === "rate_limited";
  }
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  /**
   * `getSendResponse` computes `totalPages` server-side and then strips it,
   * so we always derive it here rather than reading it off the response.
   */
  totalPages: number;
}

export interface ApiResult<T> {
  data: T;
  meta: PageMeta | null;
}

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON request body. Serialised for you. */
  body?: unknown;
  /** Raw JWT. Sent verbatim — never prefixed with "Bearer ". */
  token?: string | null;
  query?: Record<string, QueryValue>;
  /**
   * Seconds. `fetch` is NOT cached by default in Next 16, so a catalog call
   * that should be cached has to opt in explicitly.
   */
  revalidate?: number | false;
  tags?: string[];
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Needed only by `/auth/refresh-token`, which reads a cookie. */
  credentials?: RequestCredentials;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  if (!BASE_URL) {
    throw new ApiError(
      "network",
      0,
      "NEXT_PUBLIC_API_URL is not set. Add it to client/.env.local.",
    );
  }

  const base = BASE_URL.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}/api/v1${suffix}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      // Skip undefined/null/"" so callers can pass optional filters directly.
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Normalises the server's four success envelopes into `{ data, meta }`.
 *
 *  A. `createSendResponse`  -> { success, statusCode, message, data }      (most routes)
 *  B. `getSendResponse`     -> { ..., meta: { page, limit, total }, data } (orders, reviews)
 *  C. `GET /products`       -> data is itself { data: [...], meta: {...} } (handled by the
 *                              caller's schema, since only that route nests)
 *  D. upload / rate-limit   -> no `statusCode` key at all
 *
 * We never read `statusCode` from the body — the HTTP status is authoritative.
 */
function unwrap(json: unknown): { payload: unknown; meta: PageMeta | null } {
  if (json === null || typeof json !== "object") {
    return { payload: json, meta: null };
  }

  const body = json as Record<string, unknown>;

  // A response without a `data` key is not an envelope (e.g. a bare error
  // shape). Hand it through untouched and let the schema decide.
  const payload = "data" in body ? body.data : body;

  let meta: PageMeta | null = null;
  const rawMeta = body.meta;
  if (rawMeta && typeof rawMeta === "object") {
    const m = rawMeta as Record<string, unknown>;
    const page = Number(m.page);
    const limit = Number(m.limit);
    const total = Number(m.total);
    // `getSendResponse` runs parseInt over possibly-absent values, so these
    // arrive as null/NaN rather than being omitted.
    if (Number.isFinite(total) && Number.isFinite(limit) && limit > 0) {
      meta = {
        page: Number.isFinite(page) ? page : 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }
  }

  return { payload, meta };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractServerMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const body = json as Record<string, unknown>;
  // `message` first, then `errorMessage` — the server fills whichever the
  // particular AppError call happened to populate.
  for (const key of ["message", "errorMessage"] as const) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Performs the request, maps failures onto `ApiError`, and validates the
 * payload. Nothing reaches React state without passing through the schema.
 */
export async function request<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const {
    method = "GET",
    body,
    token,
    query,
    revalidate,
    tags,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    credentials,
  } = options;

  const url = buildUrl(path, query);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // RAW token. Adding "Bearer " here would break every protected request.
  if (token) headers.Authorization = token;

  const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } =
    {
      method,
      headers,
      signal: signal ?? AbortSignal.timeout(timeoutMs),
    };

  if (body !== undefined) init.body = JSON.stringify(body);
  if (credentials) init.credentials = credentials;

  if (revalidate === false || revalidate === undefined) {
    // Matches Next 16's default: uncached, fetched per request.
    init.cache = "no-store";
  } else {
    init.next = { revalidate, ...(tags ? { tags } : {}) };
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("timeout", 0);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError("network", 0);
  }

  const json = await readJson(response);

  if (!response.ok) {
    throw new ApiError(
      codeForStatus(response.status),
      response.status,
      extractServerMessage(json),
    );
  }

  const { payload, meta } = unwrap(json);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    // Log where the contract drifted; never leak the raw shape to the UI.
    console.error(
      `[api] response did not match the expected shape for ${method} ${path}`,
      parsed.error.issues,
    );
    throw new ApiError("parse", response.status);
  }

  return { data: parsed.data, meta };
}

/** Convenience wrapper for the common case where pagination is irrelevant. */
export async function requestData<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { data } = await request(path, schema, options);
  return data;
}

/**
 * For server components rendering a page section: a failed section should
 * degrade on its own rather than take the whole route down.
 */
export async function requestSafe<T>(
  path: string,
  schema: ZodType<T>,
  fallback: T,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await requestData(path, schema, options);
  } catch (error) {
    const detail = error instanceof ApiError ? error.message : error;
    console.error(`[api] ${path} failed, rendering fallback:`, detail);
    return fallback;
  }
}
