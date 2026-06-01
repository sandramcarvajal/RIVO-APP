import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "server_diagnostic.log");

export function logDiagnostic(message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
  const entry = `[${timestamp}] ${message}${metaStr}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, entry, "utf8");
  } catch (error) {
    console.error("Failed to write to local diagnostic log file:", error);
  }
  
  console.log(message, meta || "");
}
