/**
 * ============================================================================
 * SERVEUR EXPLICITE & PROXY VITE - STRATÉGIE DE DESIGN EXPÉRIMENTAL EXOME
 * ============================================================================
 * Ce fichier est le point d'entrée principal du serveur backend Node.js (Express).
 * 
 * RÔLES PRINCIPAUX :
 * 1. Mode Développement (process.env.NODE_ENV !== "production") :
 *    - Intègre Vite comme middleware pour transpiler à la volée le code TypeScript/React.
 * 2. Mode Production :
 *    - Sert les fichiers statiques pré-compilés dans le dossier /dist.
 * 3. Endpoints API (/api/*) :
 *    - Proxie de manière sécurisée les requêtes vers l'API Gemini sans exposer la clé API au navigateur.
 * ============================================================================
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Chargement des variables d'environnement depuis le fichier .env
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware pour parser les corps de requêtes au format JSON (limite augmentée pour gros JSON bed/coverage)
app.use(express.json({ limit: "10mb" }));

/**
 * Client d'IA Générative Gemini (Google GenAI SDK)
 * Initialisé uniquement côté serveur pour garder GEMINI_API_KEY confidentielle.
 */
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Route de santé (Healthcheck)
 * Utile pour vérifier que le serveur répond correctement.
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Route API pour le Conseiller Scientifique IA (Bioinformatique & Design)
 * Accepte un prompt utilisateur et un contexte optionnel de données de benchmark.
 */
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Le prompt est obligatoire" });
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
    console.error("Erreur backend dans /api/gemini/analyze:", error);
    res.status(500).json({
      error: "Échec de l'analyse scientifique IA",
      details: error.message || String(error),
    });
  }
});

/**
 * Démarrage et configuration du serveur HTTP Express
 */
async function startServer() {
  // Service des fichiers statiques généraux (ex: /public/benchmark_consolidated_data.json)
  const publicPath = path.join(process.cwd(), "public");
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== "production") {
    // Mode Développement : Intégration du serveur de dev Vite en mode middleware SPA
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Mode Production : Fichiers bundles produits par 'vite build' dans le dossier /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Écoute sur le port 3000 et l'hôte 0.0.0.0 (requis pour conteneurs Linux / Cloud Run / Docker)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVEUR OK] Application accessible sur http://localhost:${PORT}`);
  });
}

startServer();

