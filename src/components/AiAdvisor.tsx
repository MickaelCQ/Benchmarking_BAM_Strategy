import React, { useState } from "react";
import { Sparkles, Send, Bot, User, Loader2, BookOpen, Lightbulb } from "lucide-react";
import { BENCHMARK_DATASET } from "../data/benchmarkData";

export const AiAdvisor: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Bonjour ! Je suis votre conseiller en bioinformatique clinique et métriques d'alignement NGS. Comment puis-je vous aider à affiner la stratégie de design expérimental pour vos échantillons WES (MF1284, MF1358, MF746) ou interpréter les simulations de coût ?",
    },
  ]);

  const presetQuestions = [
    "Pourquoi DRAGEN a-t-il moins de soft-clipping et un meilleur taux d'indels en région homopolymérique par rapport à NextGENe ?",
    "Rédige la section Discussion en français avec un accent sur l'impact diagnostique clinique des gènes du panel ACMG v3.2.",
    "Quel test statistique devrais-je utiliser pour prouver la non-infériorité de BWA-Markdup face à DRAGEN ?",
    "Explique les différences d'identification des doublons PCR entre Picard MarkDuplicates et le marquage matériel de DRAGEN.",
  ];

  const handleSend = async (userPromptText?: string) => {
    const textToSend = userPromptText || prompt;
    if (!textToSend.trim() || loading) return;

    const newMessages = [...messages, { role: "user" as const, text: textToSend }];
    setMessages(newMessages);
    if (!userPromptText) setPrompt("");
    setLoading(true);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          context: BENCHMARK_DATASET,
        }),
      });

      const data = await response.json();
      if (data.text) {
        setMessages([...newMessages, { role: "assistant", text: data.text }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            text: "Une interruption temporaire s'est produite. Veuillez réessayer votre question.",
          },
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          text: "Impossible de joindre le module d'assistance scientifique.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">
              AI Scientific Advisor & Peer-Review Assistant
            </h2>
            <p className="text-xs text-slate-500">
              Powered by Gemini 3.6 Flash • Expert in WES NGS alignment algorithms, clinical impact, and LaTeX manuscript drafting.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Suggestion Chips */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          <span>Exemples de questions bioinformatiques & scientifiques :</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-left bg-white hover:bg-slate-50 text-slate-700 p-2.5 rounded-lg border border-slate-200 transition-colors hover:border-sky-300 font-medium text-[11px] leading-snug"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto shadow-inner">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-sky-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-2xl ${
                msg.role === "user"
                  ? "bg-sky-600 text-white rounded-tr-none font-medium"
                  : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none whitespace-pre-wrap"
              }`}
            >
              {msg.text}
            </div>

            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-sky-400 text-xs font-mono p-2 bg-slate-800/50 rounded-lg w-max">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Génération de l'analyse scientifique en cours...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-300 shadow-sm">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Posez votre question scientifique ou demandez une rédaction de section LaTeX..."
          className="flex-1 text-xs text-slate-800 px-3 py-2 outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !prompt.trim()}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
        >
          <span>Envoyer</span>
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
