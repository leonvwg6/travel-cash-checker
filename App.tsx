
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Coins, Calculator, Plane, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

type Currency = "SGD" | "AED" | "EUR";

const LIMITS: Record<"SG"|"AE"|"EU", { label: string; currency: Currency; amount: number }> = {
  SG: { label: "Singapur", currency: "SGD", amount: 20000 },
  AE: { label: "VAE (Abu Dhabi)", currency: "AED", amount: 60000 },
  EU: { label: "EU/Österreich", currency: "EUR", amount: 10000 },
};

function pretty(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function App() {
  const [amountIDR, setAmountIDR] = useState<string>("");
  const [idrPerSGD, setIdrPerSGD] = useState<string>("");
  const [idrPerAED, setIdrPerAED] = useState<string>("");
  const [idrPerEUR, setIdrPerEUR] = useState<string>("");
  const [showAll, setShowAll] = useState(true);
  const [activeTab, setActiveTab] = useState<"SG"|"AE"|"EU">("SG");

  const [autoRates, setAutoRates] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const rates = useMemo(() => ({
    SGD: Number(idrPerSGD) || NaN,
    AED: Number(idrPerAED) || NaN,
    EUR: Number(idrPerEUR) || NaN,
  }), [idrPerSGD, idrPerAED, idrPerEUR]);

  const idr = Number(String(amountIDR).replace(/\D/g, ""));

  function check(limitCurrency: Currency, limitAmount: number) {
    const rate = (rates as any)[limitCurrency] as number;
    if (!rate || isNaN(rate) || !idr) return null;
    const converted = idr / rate;
    const needsDecl = converted >= limitAmount;
    const maxBeforeDeclIDR = Math.max(0, Math.floor(limitAmount * rate));
    return { converted, needsDecl, maxBeforeDeclIDR };
  }

  const results = {
    SG: check("SGD", LIMITS.SG.amount),
    AE: check("AED", LIMITS.AE.amount),
    EU: check("EUR", LIMITS.EU.amount),
  };

  async function loadRates() {
    try {
      setFetching(true);
      setFetchError(null);
      const symbols: Currency[] = ["SGD", "AED", "EUR"];
      const responses = await Promise.all(symbols.map((cur) => fetch(`https://api.exchangerate.host/latest?base=${cur}&symbols=IDR`)));
      const jsons = await Promise.all(responses.map((r) => r.json()));
      const map: Record<Currency, number> = {} as any;
      jsons.forEach((j, i) => {
        const cur = symbols[i];
        const idrPer = j?.rates?.IDR;
        if (typeof idrPer === "number") (map as any)[cur] = idrPer;
      });
      if (!map.SGD || !map.AED || !map.EUR) throw new Error("Unvollständige Kurse");
      setIdrPerSGD(String(Math.round(map.SGD)));
      setIdrPerAED(String(Math.round(map.AED)));
      setIdrPerEUR(String(Math.round(map.EUR)));
      setLastFetchedAt(new Date());
    } catch (e: any) {
      setFetchError(e?.message || "Konnte Kurse nicht laden.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { if (autoRates) loadRates(); }, [autoRates]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-50 p-5 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <Plane className="h-8 w-8" />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Cash Declaration Checker</h1>
        </header>

        <div className="rounded-2xl border bg-white shadow-sm p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">Bargeldsumme in IDR</label>
              <input
                id="amount"
                inputMode="numeric"
                placeholder="z. B. 25.000.000"
                value={amountIDR}
                onChange={(e) => setAmountIDR(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="text-xs text-slate-500">
                Hinweis: Es geht nur um die Pflicht zur <span className="font-medium">Deklaration</span>, nicht um eine Obergrenze.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <span className="text-sm font-medium">Alle Länder anzeigen</span>
              </div>
              <button
                onClick={() => setShowAll(v => !v)}
                className={"relative inline-flex h-6 w-11 items-center rounded-full " + (showAll ? "bg-emerald-500" : "bg-slate-300")}
                aria-label="Toggle alle Länder"
              >
                <span className={"inline-block h-5 w-5 transform rounded-full bg-white transition " + (showAll ? "translate-x-5" : "translate-x-1")} />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                <span className="text-sm font-medium">Automatische Wechselkurse</span>
              </div>
              <button
                onClick={() => setAutoRates(v => !v)}
                className={"relative inline-flex h-6 w-11 items-center rounded-full " + (autoRates ? "bg-emerald-500" : "bg-slate-300")}
                aria-label="Toggle auto rates"
              >
                <span className={"inline-block h-5 w-5 transform rounded-full bg-white transition " + (autoRates ? "translate-x-5" : "translate-x-1")} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadRates}
                disabled={fetching}
                className={"inline-flex items-center rounded-xl border px-3 py-2 text-sm " + (fetching ? "opacity-60" : "")}
              >
                <RefreshCw className={"h-4 w-4 mr-2 " + (fetching ? "animate-spin" : "")} />
                Jetzt Kurse aktualisieren
              </button>
              {lastFetchedAt && (
                <span className="text-xs text-slate-500">Aktualisiert: {lastFetchedAt.toLocaleString()}</span>
              )}
            </div>

            {fetchError && <p className="text-xs text-red-600">{fetchError}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Calculator className="h-4 w-4"/>
              Gib deine Wechselkurse ein (IDR pro 1 Einheit Fremdwährung) – oder nutze Auto-Kurse:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="sgd" className="text-sm font-medium">1 SGD =</label>
                <input id="sgd" placeholder="IDR" value={idrPerSGD} onChange={(e) => setIdrPerSGD(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label htmlFor="aed" className="text-sm font-medium">1 AED =</label>
                <input id="aed" placeholder="IDR" value={idrPerAED} onChange={(e) => setIdrPerAED(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label htmlFor="eur" className="text-sm font-medium">1 EUR =</label>
                <input id="eur" placeholder="IDR" value={idrPerEUR} onChange={(e) => setIdrPerEUR(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Tipp: Auto-Kurse nutzen öffentliche Daten von exchangerate.host. Kurse können variieren; prüfe ggf. bei deiner Bank.
            </p>
          </div>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-3 rounded-xl overflow-hidden border">
            {(["SG","AE","EU"] as const).map(key => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={"px-3 py-2 text-sm " + (activeTab===key ? "bg-white font-medium" : "bg-slate-100 text-slate-600")}
              >
                {LIMITS[key].label}
              </button>
            ))}
          </div>

          {(["SG","AE","EU"] as const).map(key => {
            const lim = LIMITS[key];
            const res = (results as any)[key];
            const visible = showAll || key === activeTab;
            if (!visible) return null;
            return (
              <div key={key} className="mt-4">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="rounded-2xl border bg-white p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{lim.label} – Meldegrenze {pretty(lim.amount)} {lim.currency}</h2>
                      <span className="text-xs rounded-full bg-slate-100 px-3 py-1">{lim.currency}</span>
                    </div>

                    {!idr || !(rates as any)[lim.currency] ? (
                      <p className="text-sm text-slate-600">
                        Gib oben deine IDR-Summe und den Wechselkurs für {lim.currency} ein – oder lade die Auto-Kurse.
                      </p>
                    ) : res ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="rounded-xl border p-4">
                          <p className="text-sm text-slate-500">Dein Betrag umgerechnet</p>
                          <p className="text-2xl font-semibold">
                            {res.converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {lim.currency}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">(bei {pretty((rates as any)[lim.currency])} IDR pro {lim.currency})</p>
                        </div>
                        <div className="rounded-xl border p-4">
                          <p className="text-sm text-slate-500">Meldegrenze in IDR</p>
                          <p className="text-2xl font-semibold">{pretty(res.maxBeforeDeclIDR)} IDR</p>
                          <p className="text-xs text-slate-500 mt-1">= {pretty(lim.amount)} {lim.currency}</p>
                        </div>

                        <div className="md:col-span-2">
                          {res.needsDecl ? (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
                              <AlertCircle className="h-5 w-5" />
                              <span className="text-sm">Deklarationspflicht: <span className="font-semibold">Ja</span>. Dein Betrag liegt auf/über der Grenze.</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="text-sm">Deklarationspflicht: <span className="font-semibold">Nein</span>. Du liegst unter der Grenze.</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            Rechtlicher Hinweis: In Singapur muss Bargeld (oder gleichgestellte Wertträger) ab 20.000 SGD, in den VAE ab 60.000 AED und in der EU/Österreich ab 10.000 EUR deklariert werden. Es gibt keine Obergrenze, nur eine Meldepflicht.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        <footer className="text-xs text-slate-500 leading-relaxed">
          ⚠️ Diese App dient nur zur Orientierung. Prüfe die offiziellen Angaben der jeweiligen Behörden vor deiner Reise. Kurse schwanken, und Regeln können sich ändern.
        </footer>
      </div>
    </div>
  );
}
