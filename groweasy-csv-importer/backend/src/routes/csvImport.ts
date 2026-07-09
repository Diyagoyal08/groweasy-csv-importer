import { Router } from "express";
import multer from "multer";
import { CsvParseError, parseCsv } from "../services/csvParser";
import { processRowsWithAi } from "../services/batchProcessor";
import { RawCsvRow } from "../types/crm";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matches the reference UI
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (isCsv) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

/**
 * POST /api/csv/parse
 * Parses an uploaded CSV and returns raw rows for client-side preview.
 * No AI processing happens here — this is Step 2 in the assignment (Preview).
 */
router.post("/parse", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Field name must be 'file'." });
    }
    const text = req.file.buffer.toString("utf-8");
    const rows = parseCsv(text);
    return res.json({
      headers: Object.keys(rows[0]),
      rows,
      rowCount: rows.length,
    });
  } catch (err) {
    if (err instanceof CsvParseError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Unexpected error in /parse:", err);
    return res.status(500).json({ error: "Unexpected error while parsing the file." });
  }
});

/**
 * POST /api/csv/extract
 * Body: { rows: RawCsvRow[] }
 * Runs the AI extraction step (Step 4 in the assignment) on previously-parsed rows.
 * This is only called after the user clicks "Confirm" on the frontend.
 */
router.post("/extract", async (req, res) => {
  try {
    const rows: RawCsvRow[] = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Request body must include a non-empty 'rows' array." });
    }

    const result = await processRowsWithAi(rows);
    return res.json(result);
  } catch (err) {
    console.error("Unexpected error in /extract:", err);
    return res.status(500).json({ error: "Unexpected error during AI extraction." });
  }
});

export default router;
