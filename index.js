import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { notFound, errorMiddleware } from "./middleware/error.js";
import userRoutes from "./routes/user.js";
import professorRoutes from "./routes/proff.js";
import generalRoutes from "./routes/general.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get("/health", (req, res) => res.status(200).json({ status: "OK" }));

app.use("/users", userRoutes);
app.use("/professor", professorRoutes);
app.use("/general", generalRoutes);
app.use(notFound);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5001;

const mongoOptions = {};
if (process.env.USE_DOCUMENTDB === "true") {
  const certPath = process.env.DOCDB_CERT_PATH || path.join(__dirname, "certs", "global-bundle.pem");
  if (!fs.existsSync(certPath)) {
    console.error(`[DocumentDB] TLS cert not found at ${certPath}. Run: bash scripts/download-cert.sh`);
    process.exit(1);
  }
  mongoOptions.tls = true;
  mongoOptions.tlsCAFile = certPath;
  mongoOptions.retryWrites = false;
  console.log(`[DocumentDB] TLS cert loaded from ${certPath}`);
}

mongoose
  .connect(process.env.MONGO_URL, mongoOptions)
  .then(() => {
    console.log("[DB] Connected successfully");
    app.listen(PORT, "0.0.0.0", () => console.log(`[Server] Listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error(`[DB] Connection failed: ${error.message}`);
    process.exit(1);
  });
