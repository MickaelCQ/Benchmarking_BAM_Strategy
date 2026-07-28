import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Gemini AI Assistant route for Bioinformatic & Clinical interpretation
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const systemInstruction = `You are a Senior Principal Bioinformatician & Clinical Genomics Specialist expert in NGS alignment algorithms (Dragen FPGA hardware hash mapping, BWA-MEM Burrows-Wheeler transform with Picard markdup, NextGENe alignment engine). You specialize in benchmarking whole-exome sequencing (WES) alignment pipelines, variant calling concordance, alignment artifacts (homopolymers, GC bias, split reads, soft clipping), and statistical rigor for peer-reviewed journal publications (e.g., Nature Biotechnology, Oxford Bioinformatics, Genome Biology).

Provide scientifically rigorous, articulate, and actionable responses in clean Markdown or LaTeX snippets as requested. Respond in the user's language (French if prompted in French, English if prompted in English). Include exact formulas, biological rationale, and clinical diagnostic impact where applicable.`;

    const userMessage = `${context ? `[BENCHMARK DATASET CONTEXT]:\n${JSON.stringify(context, null, 2)}\n\n` : ""}[USER QUESTION/REQUEST]:\n${prompt}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze:", error);
    res.status(500).json({
      error: "Failed to generate AI scientific analysis",
      details: error.message || String(error),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NGS Benchmark Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
