import { UAParser } from "ua-parser-js";
import { Request } from "express";

export type DevicePlatform = "ios" | "android" | "unknown";

/**
 * iOS 13+ iPads send a desktop Safari UA and rely on the
 * `maxTouchPoints` hint — which isn't available server-side.
 * The best server-side workaround is to also check the
 * `Sec-CH-UA-Platform` / `Sec-CH-UA-Mobile` client-hint headers
 * and fall back to the `platform` header sent by some browsers.
 */
function isIpadFromHints(req: Request): boolean {
  const platform = (req.headers["sec-ch-ua-platform"] as string | undefined)
    ?.replace(/"/g, "")
    .toLowerCase();

  const mobile = req.headers["sec-ch-ua-mobile"] as string | undefined;

  // "macOS" + ?0 (non-mobile) from an iPad is impossible to distinguish
  // purely server-side in iOS 13+. Sending an Accept-Language or
  // X-Requested-With hint from your app itself is the reliable fix.
  return platform === "ios" || mobile === "?1";
}

export function detectPlatform(req: Request): DevicePlatform {
  const rawUA = req.headers["user-agent"] ?? "";
  const parser = new UAParser(rawUA);
  const os = parser.getOS();
  const device = parser.getDevice();

  const osName = os.name?.toLowerCase() ?? "";
  const deviceType = device.type?.toLowerCase() ?? "";

  // iOS — explicit OS name match (iPhone, iPod)
  if (
    osName === "ios" ||
    ["iphone", "ipod"].some((d) => rawUA.toLowerCase().includes(d))
  ) {
    return "ios";
  }

  // iPad — ua-parser-js catches pre-iOS13; hint headers for iOS13+
  if (rawUA.toLowerCase().includes("ipad") || isIpadFromHints(req)) {
    return "ios";
  }

  // Android
  if (osName === "android") {
    return "android";
  }

  // Generic mobile fallback — ua-parser-js resolved device type
  if (deviceType === "mobile" || deviceType === "tablet") {
    // Could be an unrecognised Android fork; default to Android
    return "android";
  }

  return "unknown";
}
