import {
  adminSettingsSchema,
  publicSettingsSchema,
  type AdminSettings,
  type PublicSettings,
  type UpdateSettingsPayload,
} from "./schemas/settings";
import { requestData, type RequestOptions } from "./client";

/** Marketing IDs and shipping values change rarely but should not go stale. */
const SETTINGS_REVALIDATE = 600;

/**
 * Public marketing + shipping config. Returns `{}` on a fresh install, which
 * is valid — every field is optional and "missing" means "not configured".
 */
export async function getPublicSettings(
  options: RequestOptions = {},
): Promise<PublicSettings> {
  return requestData("/settings", publicSettingsSchema, {
    revalidate: SETTINGS_REVALIDATE,
    ...options,
  });
}

/**
 * Never let a settings outage break a page. A missing WhatsApp number just
 * means that button does not render.
 */
export async function getPublicSettingsSafe(
  options: RequestOptions = {},
): Promise<PublicSettings> {
  try {
    return await getPublicSettings(options);
  } catch (error) {
    console.error("[api] getPublicSettings failed, using defaults:", error);
    return {};
  }
}

/** admin/superAdmin. Returns the full document, including write-only fields. */
export async function updateSettings(
  token: string,
  payload: UpdateSettingsPayload,
): Promise<AdminSettings> {
  return requestData("/settings", adminSettingsSchema, {
    method: "PATCH",
    body: payload,
    token,
    revalidate: false,
  });
}
