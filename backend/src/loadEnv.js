/**
 * Загружает backend/.env всегда из папки бэкенда, даже если `node` запущен из другой cwd.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn("[concierge] .env не найден или не прочитан:", envPath, result.error.message);
}
