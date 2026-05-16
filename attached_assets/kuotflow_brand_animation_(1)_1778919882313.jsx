import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ReceiptText, ClipboardCheck, Zap, Globe2, CheckCircle2, ArrowRightLeft, Send } from "lucide-react";

const currencies = [
  { code: "USD", symbol: "$", amount: "2,480.00", rate: "1.000" },
  { code: "MYR", symbol: "RM", amount: "11,672.40", rate: "4.707" },
  { code: "NZD", symbol: "$", amount: "4,092.20", rate: "1.650" },
  { code: "EUR", symbol: "€", amount: "2,284.60", rate: "0.921" },
];

const documents = [
  {
    type: "Quotation",
    shortCode: "QF",
    number: "QF-2026-047",
    status: "Draft ready",
    action: "Send quotation",
    icon: FileText,
    rows: [
      ["Service / Product item", "1", "$1,200"],
      ["Professional fee", "3", "$750"],
      ["Setup / delivery charge", "1", "$530"],
    ],
  },
  {
    type: "Invoice",
    shortCode: "INV",
    number: "INV-2026-118",
    status: "Payment due",
    action: "Send invoice",
    icon: ReceiptText,
    rows: [
      ["Approved service item", "1", "$1,200"],
      ["Professional fee billed", "3", "$750"],
      ["Setup / delivery billed", "1", "$530"],
    ],
  },
  {
    type: "Receipt",
    shortCode: "RCT",
    number: "RCT-2026-224",
    status: "Paid",
    action: "Issue receipt",
    icon: ClipboardCheck,
    rows: [
      ["Payment received", "1", "$1,200"],
      ["Professional fee paid", "3", "$750"],
      ["Setup / delivery paid", "1", "$530"],
    ],
  },
];

export default function KuotFlowBrandAnimation() {
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const [documentIndex, setDocumentIndex] = useState(0);
  const activeCurrency = currencies[currencyIndex];
  const activeDocument = documents[documentIndex];
  const ActiveDocumentIcon = activeDocument.icon;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrencyIndex((current) => (current + 1) % currencies.length);
    }, 1700);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDocumentIndex((current) => (current + 1) % documents.length);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const orbitItems = useMemo(() => currencies.map((c, i) => ({ ...c, angle: i * 90 })), []);

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#07111f] text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(49,130,206,0.35),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(180,113,54,0.28),transparent_25%),linear-gradient(135deg,#07111f_0%,#0d1f35_50%,#1a120b_100%)]" />
      <motion.div
        className="absolute h-80 w-80 rounded-full border border-blue-300/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute h-[34rem] w-[34rem] rounded-full border border-amber-300/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/5 px-4 py-2 text-sm text-blue-100 backdrop-blur">
            <Zap className="h-4 w-4 text-amber-300" />
            SaaS quoting, invoicing & receipting engine
          </div>

          <div>
            <motion.h1
              className="text-5xl font-black tracking-tight md:text-7xl"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              Kuot<span className="text-blue-300">Flow</span>
            </motion.h1>
            <motion.p
              className="mt-4 text-2xl font-semibold text-amber-200 md:text-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.7 }}
            >
              Quotes that close.
            </motion.p>
          </div>

          <motion.p
            className="max-w-xl text-lg leading-relaxed text-slate-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
          >
            Turn real quotation details into polished documents, invoices, and receipts instantly. Switch currencies on the spot and use live exchange rates to close deals faster.
          </motion.p>

          <div className="flex flex-wrap gap-3">
            {["Quotes", "Invoices", "Receipts", "Multi-currency", "Live FX"].map((item, index) => (
              <motion.div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 shadow-2xl backdrop-blur"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + index * 0.15 }}
              >
                {item}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative h-[620px]">
          <motion.div
            className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <motion.div
            className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {orbitItems.map((item) => (
              <motion.div
                key={item.code}
                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-bold shadow-2xl backdrop-blur-xl"
                style={{ transform: `rotate(${item.angle}deg) translateY(-14rem) rotate(-${item.angle}deg)` }}
              >
                {item.code}
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="absolute left-1/2 top-1/2 w-[380px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.86, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="border-b border-white/10 bg-white/10 p-5">
              <div className="flex items-center justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDocument.type}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-400/20 text-blue-200">
                      <ActiveDocumentIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">{activeDocument.type}</p>
                      <p className="font-bold">{activeDocument.number}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <motion.div
                  className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Live
                </motion.div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeDocument.type + "-rows"}
                  className="space-y-4"
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
                  transition={{ duration: 0.35 }}
                >
                  {activeDocument.rows.map((row, index) => (
                    <motion.div
                      key={row[0]}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-slate-950/35 p-3 text-sm"
                      initial={{ opacity: 0, x: 25 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                    >
                      <span className="text-slate-200">{row[0]}</span>
                      <span className="text-slate-400">x{row[1]}</span>
                      <span className="font-semibold text-white">{row[2]}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              <div className="rounded-3xl border border-blue-300/20 bg-blue-400/10 p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-blue-100">
                  <span className="flex items-center gap-2"><Globe2 className="h-4 w-4" /> Currency</span>
                  <span className="flex items-center gap-1 text-amber-200"><ArrowRightLeft className="h-4 w-4" /> FX {activeCurrency.rate}</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCurrency.code}
                    initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
                    transition={{ duration: 0.35 }}
                    className="flex items-end justify-between"
                  >
                    <div>
                      <p className="text-sm text-slate-300">Total in {activeCurrency.code}</p>
                      <p className="text-4xl font-black tracking-tight">{activeCurrency.symbol}{activeCurrency.amount}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-2 font-bold text-amber-200">
                      {activeCurrency.code}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <motion.div
                className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-500 to-amber-500 px-5 py-4 font-bold text-white shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                whileHover={{ scale: 1.02 }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeDocument.action}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={{ duration: 0.3 }}
                  >
                    <Send className="h-5 w-5" /> {activeDocument.action}
                  </motion.span>
                </AnimatePresence>
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="absolute right-4 top-20 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.9 }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-300" />
              <div>
                <p className="font-bold text-emerald-100">Approved</p>
                <p className="text-xs text-emerald-200/80">Quote → Invoice → Receipt</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-16 left-3 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.1 }}
          >
            <p className="text-xs text-amber-100/80">Rate refreshed</p>
            <p className="font-black text-amber-100">Currency-ready documents</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
