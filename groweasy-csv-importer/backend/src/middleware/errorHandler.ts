import { NextFunction, Request, Response } from "express";

/** Catches multer errors (e.g. file too large) and anything else that slips through. */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Maximum size is 5MB." });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: err?.message || "Internal server error." });
}
