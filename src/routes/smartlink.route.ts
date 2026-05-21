import { Router, Request, Response } from "express";
import appLinks from "../config/links";
import { detectPlatform } from "../utils/detectPlatform";

const router = Router();

/**
 * Sets headers that guarantee the redirect is never cached.
 * Critical for a smart-link — the device check must re-run on every click.
 */
function setNoCacheHeaders(res: Response): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");      // HTTP/1.0 back-compat
  res.setHeader("Expires", "0");            // Proxies
  res.setHeader("Surrogate-Control", "no-store"); // CDN/Varnish layer
}

/**
 * GET /go
 * Smart-link entry point. Resolves user device and 302-redirects
 * to the appropriate destination.
 *
 * Optional query params:
 *   ?ios=<url>      — per-request iOS override
 *   ?android=<url>  — per-request Android override
 *   ?fallback=<url> — per-request fallback override
 *
 * This makes the single endpoint reusable across multiple campaigns
 * without deploying new routes.
 */
router.get("/go", (req: Request, res: Response): void => {
  setNoCacheHeaders(res);

  // Per-request URL overrides (useful for campaign-specific links)
  const ios = (req.query.ios as string | undefined) ?? appLinks.ios;
  const android = (req.query.android as string | undefined) ?? appLinks.android;
  const fallback = (req.query.fallback as string | undefined) ?? appLinks.fallback;

  // Validate override URLs to prevent open redirect abuse
  const allowedHosts = [
    "apps.apple.com",
    "play.google.com/store/apps/details?id=com.mydove.app",
    "dovewallet.co",
    "www.dovewallet.co"
  ];

  function isSafeUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
      const { hostname } = new URL(url);
      return allowedHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
    } catch {
      return false;
    }
  }

  const resolvedIos = isSafeUrl(ios) ? ios : appLinks.ios;
  const resolvedAndroid = isSafeUrl(android) ? android : appLinks.android;
  const resolvedFallback = isSafeUrl(fallback) ? fallback : appLinks.fallback;

  const platform = detectPlatform(req);

  const destinations: Record<typeof platform, string | undefined> = {
    ios: resolvedIos || resolvedFallback,
    android: resolvedAndroid || resolvedFallback,
    unknown: resolvedFallback,
  };

  const destination = destinations[platform] || resolvedFallback || "/";

  // 302 (temporary) — never 301. A 301 gets cached by the browser and
  // will bypass this router on every subsequent click from that device.
  res.redirect(302, destination);
});

/**
 * GET /go/debug  (remove or gate behind auth in production)
 * Returns parsed UA info as JSON — useful during integration/QA.
 */
router.get("/go/debug", (req: Request, res: Response): void => {
  const platform = detectPlatform(req);
  res.json({
    userAgent: req.headers["user-agent"] ?? null,
    platform,
    secChUaPlatform: req.headers["sec-ch-ua-platform"] ?? null,
    secChUaMobile: req.headers["sec-ch-ua-mobile"] ?? null,
    timestamp: new Date().toISOString(),
  });
});


/**
 * GET /health
 * Health check endpoint for load balancers and monitoring.
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      status: "ok",
      message: "Server is running",
      timestamp: new Date().toISOString(),
      service: "smartlink-router",
    });
  } catch (error) {
    console.error("[Health] Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server is unhealthy",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
