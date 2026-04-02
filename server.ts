import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API Proxy for Google Apps Script (to avoid CORS and hide URL)
app.post("/api/gas", async (req, res) => {
  const GAS_URL = process.env.GAS_URL; // User will set this in env
  if (!GAS_URL) {
    return res.status(500).json({ status: "error", message: "GAS_URL not configured" });
  }

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify(req.body),
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: "error", message: "Failed to connect to GAS" });
  }
});

// Vite middleware for development or static serving for production
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only listen if not running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
