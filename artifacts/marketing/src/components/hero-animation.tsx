import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, ReceiptText, ClipboardCheck,
  Globe2, CheckCircle2, ArrowRightLeft, Send,
} from "lucide-react";

const currencies = [
  { code: "USD", symbol: "$",  amount: "2,480.00",   rate: "1.000" },
  { code: "MYR", symbol: "RM", amount: "11,672.40",  rate: "4.707" },
  { code: "NZD", symbol: "$",  amount: "4,092.20",   rate: "1.650" },
  { code: "EUR", symbol: "€",  amount: "2,284.60",   rate: "0.921" },
];

const documents = [
  {
    type: "Quotation",
    number: "QF-2026-047",
    action: "Send quotation",
    icon: FileText,
    rows: [
      ["Service / Product item", "1", "$1,200"],
      ["Professional fee",       "3", "$750"],
      ["Setup / delivery charge","1", "$530"],
    ],
  },
  {
    type: "Invoice",
    number: "INV-2026-118",
    action: "Send invoice",
    icon: ReceiptText,
    rows: [
      ["Approved service item",    "1", "$1,200"],
      ["Professional fee billed",  "3", "$750"],
      ["Setup / delivery billed",  "1", "$530"],
    ],
  },
  {
    type: "Receipt",
    number: "RCT-2026-224",
    action: "Issue receipt",
    icon: ClipboardCheck,
    rows: [
      ["Payment received",       "1", "$1,200"],
      ["Professional fee paid",  "3", "$750"],
      ["Setup / delivery paid",  "1", "$530"],
    ],
  },
];

export function HeroAnimation() {
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const [documentIndex, setDocumentIndex] = useState(0);

  const activeCurrency = currencies[currencyIndex];
  const activeDocument = documents[documentIndex];
  const ActiveDocumentIcon = activeDocument.icon;

  useEffect(() => {
    const id = setInterval(() => setCurrencyIndex((i) => (i + 1) % currencies.length), 1700);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setDocumentIndex((i) => (i + 1) % documents.length), 2600);
    return () => clearInterval(id);
  }, []);

  const orbitItems = useMemo(() => currencies.map((c, i) => ({ ...c, angle: i * 90 })), []);

  return (
    <div className="relative h-[620px] w-full">
      {/* Ambient glow */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl"
        animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Orbital ring with currency badges */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {orbitItems.map((item) => (
          <motion.div
            key={item.code}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-bold text-white shadow-2xl backdrop-blur-xl"
            style={{ transform: `rotate(${item.angle}deg) translateY(-14rem) rotate(-${item.angle}deg)` }}
          >
            {item.code}
          </motion.div>
        ))}
      </motion.div>

      {/* Central document card */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-[380px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-2xl"
        initial={{ opacity: 0, scale: 0.86, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* Card header */}
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
                  <p className="font-bold text-white">{activeDocument.number}</p>
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

        {/* Card body */}
        <div className="space-y-4 p-5">
          {/* Line items */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDocument.type + "-rows"}
              className="space-y-2"
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

          {/* Currency switcher */}
          <div className="rounded-3xl border border-blue-300/20 bg-blue-400/10 p-4">
            <div className="mb-3 flex items-center justify-between text-sm text-blue-100">
              <span className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" /> Currency
              </span>
              <span className="flex items-center gap-1 text-amber-200">
                <ArrowRightLeft className="h-4 w-4" /> FX {activeCurrency.rate}
              </span>
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
                  <p className="text-4xl font-black tracking-tight text-white">
                    {activeCurrency.symbol}{activeCurrency.amount}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2 font-bold text-amber-200">
                  {activeCurrency.code}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action button */}
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

      {/* Floating badge — top right */}
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

      {/* Floating badge — bottom left */}
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
  );
}
