import React, { useState, useMemo } from "react";
import {
  Calculator,
  Plus,
  Trash2,
  Download,
  Info,
  CheckCircle2,
  TrendingDown,
  Layers,
  Sparkles,
  RotateCcw,
  Sliders,
  DollarSign,
  PieChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

export interface ActivityRow {
  id: string;
  name: string;
  depthTarget: number; // e.g. 300x, 120x, 80x
  sampleCount: number; // e.g. 5, 20, 12
}

export interface CassetteOption {
  id: string;
  name: string;
  capacityX: number; // e.g. 4800 X
  priceEuro: number; // e.g. 5820 €
  description: string;
}

export const CostSimulationModeler: React.FC = () => {
  // Preset default activities matching user's spreadsheet example
  const defaultActivities: ActivityRow[] = [
    { id: "act_1", name: "Exome panel (ex: Marfan / Cardio)", depthTarget: 300, sampleCount: 5 },
    { id: "act_2", name: "Exome classique (ex: Biochimie)", depthTarget: 120, sampleCount: 20 },
    { id: "act_3", name: "Exome trio (ex: Prénatal)", depthTarget: 80, sampleCount: 12 },
  ];

  // Customizable Cassettes / Flowcells
  const [cassettes, setCassettes] = useState<CassetteOption[]>([
    {
      id: "P4_S4",
      name: "Flowcell P4 / S4 (Haute Capacité 4800X)",
      capacityX: 4800,
      priceEuro: 5820,
      description: "Séquençage grand volume mutualisé pour cohortes hospitalières",
    },
    {
      id: "P2_S2",
      name: "Flowcell P2 / S2 (Moyenne Capacité 2400X)",
      capacityX: 2400,
      priceEuro: 3400,
      description: "Séquençage intermédiaire pour sous-séries régulières",
    },
    {
      id: "P1_Micro",
      name: "Flowcell P1 / Micro (Basse Capacité 800X)",
      capacityX: 800,
      priceEuro: 1600,
      description: "Run rapide ciblé d'urgence diagnostic",
    },
  ]);

  const [selectedCassetteId, setSelectedCassetteId] = useState<string>("P4_S4");
  const [activities, setActivities] = useState<ActivityRow[]>(defaultActivities);
  const [useSpikeIn, setUseSpikeIn] = useState<boolean>(false);
  const [spikeInPrice, setSpikeInPrice] = useState<number>(250); // € pour contrôle spike-in
  const [customCassettePrice, setCustomCassettePrice] = useState<number | null>(null);

  // Active cassette selection
  const activeCassette = useMemo(() => {
    const found = cassettes.find((c) => c.id === selectedCassetteId) || cassettes[0];
    if (customCassettePrice !== null) {
      return { ...found, priceEuro: customCassettePrice };
    }
    return found;
  }, [cassettes, selectedCassetteId, customCassettePrice]);

  // Calculations
  const totals = useMemo(() => {
    let totalSamples = 0;
    let totalXBurden = 0;

    const activityDetails = activities.map((act) => {
      const rowBurdenX = act.depthTarget * act.sampleCount;
      totalSamples += act.sampleCount;
      totalXBurden += rowBurdenX;
      return {
        ...act,
        rowBurdenX,
      };
    });

    const baseCassetteCost = activeCassette.priceEuro;
    const effectiveSpikeCost = useSpikeIn ? spikeInPrice : 0;
    const totalCostNoSpike = baseCassetteCost;
    const totalCostWithSpike = baseCassetteCost + spikeInPrice;
    const currentTotalCost = baseCassetteCost + effectiveSpikeCost;

    const fillRatePct = activeCassette.capacityX > 0 ? (totalXBurden / activeCassette.capacityX) * 100 : 0;

    const avgCostPerSampleOverall = totalSamples > 0 ? currentTotalCost / totalSamples : 0;
    const costPerX = totalXBurden > 0 ? currentTotalCost / totalXBurden : 0;

    // Prorated cost per activity
    const activityCosts = activityDetails.map((act) => {
      const costPerSample = act.depthTarget * costPerX;
      const totalActivityCost = costPerSample * act.sampleCount;
      const pctOfTotalCost = currentTotalCost > 0 ? (totalActivityCost / currentTotalCost) * 100 : 0;
      return {
        ...act,
        costPerSample,
        totalActivityCost,
        pctOfTotalCost,
      };
    });

    return {
      totalSamples,
      totalXBurden,
      fillRatePct,
      currentTotalCost,
      totalCostNoSpike,
      totalCostWithSpike,
      avgCostPerSampleOverall,
      costPerX,
      activityCosts,
    };
  }, [activities, activeCassette, useSpikeIn, spikeInPrice]);

  // Curve data generator (N = 1 to 60 samples)
  const curveData = useMemo(() => {
    const data = [];
    const baseCassetteCost = activeCassette.priceEuro;

    for (let n = 1; n <= 60; n++) {
      const costNoSpike = Number((baseCassetteCost / n).toFixed(2));
      const costWithSpike = Number(((baseCassetteCost + spikeInPrice) / n).toFixed(2));

      data.push({
        n,
        costNoSpike,
        costWithSpike,
        currentChoice: useSpikeIn ? costWithSpike : costNoSpike,
      });
    }
    return data;
  }, [activeCassette, spikeInPrice, useSpikeIn]);

  // Add new activity row
  const handleAddActivity = () => {
    const newId = `act_${Date.now()}`;
    setActivities([
      ...activities,
      { id: newId, name: `Nouvelle Activité ${activities.length + 1}`, depthTarget: 100, sampleCount: 5 },
    ]);
  };

  // Update activity field
  const handleUpdateActivity = (id: string, field: keyof ActivityRow, value: string | number) => {
    setActivities(
      activities.map((a) => {
        if (a.id === id) {
          return { ...a, [field]: value };
        }
        return a;
      })
    );
  };

  // Remove activity row
  const handleRemoveActivity = (id: string) => {
    if (activities.length <= 1) return;
    setActivities(activities.filter((a) => a.id !== id));
  };

  // Reset to default spreadsheet parameters
  const handleReset = () => {
    setActivities(defaultActivities);
    setSelectedCassetteId("P4_S4");
    setUseSpikeIn(false);
    setSpikeInPrice(250);
    setCustomCassettePrice(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csv = "Activité;Profondeur Visée (X);Nombre Échantillons;Charge Totale (X);Coût Unitaire Est. (€);Coût Total Activité (€);% Coût Total\n";
    totals.activityCosts.forEach((a) => {
      csv += `"${a.name}";${a.depthTarget};${a.sampleCount};${a.rowBurdenX};${a.costPerSample.toFixed(2)};${a.totalActivityCost.toFixed(2)};${a.pctOfTotalCost.toFixed(1)}%\n`;
    });
    csv += `\nTOTAL;--;${totals.totalSamples};${totals.totalXBurden} X;${totals.avgCostPerSampleOverall.toFixed(2)} €/échantillon;${totals.currentTotalCost.toFixed(2)} €;100%\n`;
    csv += `Cassette;${activeCassette.name};Capacité: ${activeCassette.capacityX} X;Taux Remplissage: ${totals.fillRatePct.toFixed(1)}%\n`;
    csv += `Option Spike-in;${useSpikeIn ? "OUI (+250 €)" : "NON"}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `simulation_cout_mutualise_${totals.totalSamples}samples.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Calculator className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Modélisation & Simulation du Coût Mutualisé par Activité
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl">
            Simulateur financier de séquençage à haut débit : répartissez le coût fixe d'une cassette/flowcell entre plusieurs activités diagnostics (Panel, Exome, Trios) selon la profondeur ciblée ($X$), le nombre d'échantillons et le mode avec/sans spike-in.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Réinitialiser</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Samples */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Échantillons Totaux</span>
            <Layers className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totals.totalSamples} <span className="text-xs font-normal text-slate-500">ech</span>
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {activities.length} activités cumulées
          </div>
        </div>

        {/* Total Depth Burden X */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Charge Totale ($X$)</span>
            <Sliders className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-950 font-mono">
            {totals.totalXBurden.toLocaleString()} <span className="text-xs font-normal text-slate-500">X</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Profondeur moyenne : {(totals.totalSamples > 0 ? totals.totalXBurden / totals.totalSamples : 0).toFixed(0)}X
          </div>
        </div>

        {/* Flowcell Fill Rate */}
        <div className={`p-4 rounded-xl border shadow-xs space-y-1 ${
          totals.fillRatePct > 105
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : totals.fillRatePct > 90
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider flex items-center justify-between opacity-80">
            <span>Taux de Remplissage</span>
            <PieChart className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black font-mono">
            {totals.fillRatePct.toFixed(1)}%
          </div>
          <div className="text-[11px] font-medium opacity-90">
            Capacité : {activeCassette.capacityX} X ({totals.fillRatePct > 100 ? "Dépassement" : "Optimale"})
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Coût Total Run</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {totals.currentTotalCost.toLocaleString()} €
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {useSpikeIn ? `Inclus Spike-in (+${spikeInPrice}€)` : "Sans spike-in"}
          </div>
        </div>

        {/* Cost per Sample */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-xl border border-indigo-700 shadow-md space-y-1">
          <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
            <span>Coût Moyen / Échantillon</span>
            <TrendingDown className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-300 font-mono">
            {totals.avgCostPerSampleOverall.toFixed(2)} €
          </div>
          <div className="text-[11px] text-indigo-200">
            {(totals.costPerX * 100).toFixed(2)} € par tranche de 100X
          </div>
        </div>
      </div>

      {/* Main Grid: Parameters vs Dynamic Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls & Activities Matrix */}
        <div className="lg:col-span-6 space-y-6">
          {/* Cassette & Flowcell Options Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>1. Choix de la Cassette / Flowcell de Séquençage</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">Prix Réactif + Support</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cassettes.map((c) => {
                const isSelected = selectedCassetteId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCassetteId(c.id);
                      setCustomCassettePrice(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{c.name.split(" (")[0]}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{c.capacityX} X max</div>
                    </div>
                    <div className="mt-3 font-mono font-black text-sm text-indigo-950">
                      {c.priceEuro} €
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Price Input & Spike-in Toggle */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Prix personnalisé cassette (€)
                </label>
                <input
                  type="number"
                  value={customCassettePrice !== null ? customCassettePrice : activeCassette.priceEuro}
                  onChange={(e) => setCustomCassettePrice(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contrôle Spike-In / Témoin Interne
                </label>
                <div className="flex items-center space-x-2 pt-0.5">
                  <button
                    onClick={() => setUseSpikeIn(false)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      !useSpikeIn
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    Sans spike-in
                  </button>
                  <button
                    onClick={() => setUseSpikeIn(true)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      useSpikeIn
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    Avec spike-in (+{spikeInPrice}€)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Activities Configuration Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Sliders className="h-4 w-4 text-sky-600" />
                  <span>2. Paramétrage des Activités & Profondeurs Attendues</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ajustez les lignes d'activité diagnostics, le nombre d'échantillons et la profondeur $X$ voulue.
                </p>
              </div>

              <button
                onClick={handleAddActivity}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Activité</span>
              </button>
            </div>

            <div className="space-y-3">
              {activities.map((act, index) => {
                const calculatedX = act.depthTarget * act.sampleCount;
                return (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">
                        Ligne #{index + 1}
                      </span>
                      {activities.length > 1 && (
                        <button
                          onClick={() => handleRemoveActivity(act.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Supprimer cette activité"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-slate-500 font-medium">Nom de l'activité</label>
                        <input
                          type="text"
                          value={act.name}
                          onChange={(e) => handleUpdateActivity(act.id, "name", e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 font-medium">Depth attendu (X)</label>
                        <input
                          type="number"
                          min="1"
                          value={act.depthTarget}
                          onChange={(e) => handleUpdateActivity(act.id, "depthTarget", Math.max(1, Number(e.target.value)))}
                          className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 font-medium">Nbre ech.</label>
                        <input
                          type="number"
                          min="1"
                          value={act.sampleCount}
                          onChange={(e) => handleUpdateActivity(act.id, "sampleCount", Math.max(1, Number(e.target.value)))}
                          className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 text-right">
                        <label className="block text-[10px] text-slate-500 font-medium">Charge X</label>
                        <div className="text-xs font-bold font-mono text-indigo-900 pt-1">
                          {calculatedX} X
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Amortization Curve & Breakdown Table */}
        <div className="lg:col-span-6 space-y-6">
          {/* Amortization Chart Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-indigo-600" />
                  <span>3. Courbe Dynamique d'Amortissement du Coût par Échantillon</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Évolution du coût unitaire (€/échantillon) en fonction du nombre total d'échantillons sur la cassette.
                </p>
              </div>

              <div className="text-right font-mono text-xs text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 font-bold">
                Point actuel : N={totals.totalSamples} ({totals.avgCostPerSampleOverall.toFixed(1)}€)
              </div>
            </div>

            {/* Recharts Amortization Curve */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="n"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    label={{ value: "Nombre total d'échantillons (N)", position: "insideBottom", offset: -12, fontSize: 11, fill: "#475569" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    unit=" €"
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "0.75rem", color: "#ffffff", border: "none", fontSize: "12px" }}
                    formatter={(val: any, name: any) => [
                      `${Number(val).toFixed(2)} €`,
                      name === "costNoSpike" ? "Sans spike-in" : "Avec spike-in",
                    ]}
                    labelFormatter={(label) => `${label} Échantillons`}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />

                  <Line
                    type="monotone"
                    dataKey="costNoSpike"
                    name="Sans spike-in (€/ech)"
                    stroke="#0284c7"
                    strokeWidth={useSpikeIn ? 1.5 : 3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="costWithSpike"
                    name="Avec spike-in (+250€)"
                    stroke="#059669"
                    strokeWidth={useSpikeIn ? 3 : 1.5}
                    strokeDasharray={useSpikeIn ? undefined : "4 4"}
                    dot={false}
                  />

                  {/* Reference line for current sample count */}
                  {totals.totalSamples > 0 && totals.totalSamples <= 60 && (
                    <ReferenceLine
                      x={totals.totalSamples}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      label={{
                        value: `Actuel: ${totals.totalSamples} ech (${totals.avgCostPerSampleOverall.toFixed(0)}€)`,
                        position: "top",
                        fill: "#6d28d9",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    />
                  )}

                  {totals.totalSamples > 0 && totals.totalSamples <= 60 && (
                    <ReferenceDot
                      x={totals.totalSamples}
                      y={Number(totals.avgCostPerSampleOverall.toFixed(2))}
                      r={6}
                      fill="#8b5cf6"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Cost Share Breakdown Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <PieChart className="h-4 w-4 text-emerald-600" />
                <span>4. Ventilation du Coût Proratisé par Activité</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">Pondération par la Profondeur $X$</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                    <th className="py-2 px-3 font-semibold">Activité</th>
                    <th className="py-2 px-2 font-semibold text-center">Depth</th>
                    <th className="py-2 px-2 font-semibold text-center">Nbre</th>
                    <th className="py-2 px-2 font-semibold text-right">Charge X</th>
                    <th className="py-2 px-3 font-semibold text-right">Coût / ech</th>
                    <th className="py-2 px-3 font-semibold text-right">Total Activité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {totals.activityCosts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">{a.name}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{a.depthTarget}X</td>
                      <td className="py-2 px-2 text-center text-slate-600">{a.sampleCount}</td>
                      <td className="py-2 px-2 text-right text-indigo-900 font-bold">{a.rowBurdenX} X</td>
                      <td className="py-2 px-3 text-right font-bold text-sky-900">{a.costPerSample.toFixed(2)} €</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-950">
                        {a.totalActivityCost.toFixed(2)} € <span className="text-[10px] text-slate-400 font-normal">({a.pctOfTotalCost.toFixed(1)}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono font-bold text-xs">
                    <td className="py-2.5 px-3 font-sans">TOTAL MUTUALISÉ</td>
                    <td className="py-2.5 px-2 text-center">--</td>
                    <td className="py-2.5 px-2 text-center">{totals.totalSamples}</td>
                    <td className="py-2.5 px-2 text-right text-indigo-300">{totals.totalXBurden} X</td>
                    <td className="py-2.5 px-3 text-right text-sky-300">{totals.avgCostPerSampleOverall.toFixed(2)} €</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">{totals.currentTotalCost.toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
