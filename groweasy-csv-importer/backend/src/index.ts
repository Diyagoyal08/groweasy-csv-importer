import "dotenv/config";
import cors from "cors";
import express from "express";
import csvImportRouter from "./routes/csvImport";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/csv", csvImportRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GrowEasy CSV Importer backend listening on port ${PORT}`);
});
