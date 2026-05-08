import React, { useState, useEffect } from "react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, CheckCircle2, FileText, Settings, CreditCard, Users, Zap,
  Shield, Loader2, BarChart, Clock, PenTool, Globe, Layers, Send,
  BadgeCheck, ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  return (
    <MarketingLayout>

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-24 md:pt-36 pb-20 md:pb-32 px-4 md:px-6 max-w-7xl mx-auto w-full">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/20 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Zap className="w-3.5 h-3.5" />
            Introducing QuoteFlow
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-8 leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-700">
            Quotes that <span className="text-primary">close.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            Professional IT service quotations — created in minutes, sent with a
            link, paid with a click. The quoting engine your MSP deserves.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 w-full sm:w-auto">
            <a href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base rounded-full" data-testid="hero-cta">
                Start for free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
            <a
              href="#pricing"
              className="w-full sm:w-auto"
              data-testid="hero-see-pricing"
              onClick={(e) => {
                if (typeof window !== "undefined") {
                  e.preventDefault();
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-base rounded-full bg-background/50 backdrop-blur-sm">
                See pricing
              </Button>
            </a>
          </div>
        </div>

        {/* Hero App Mockup */}
        <div className="mt-16 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <div className="bg-background border border-border/60 rounded-2xl shadow-xl overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
              <div className="flex-1 mx-3 bg-background border border-border/40 rounded-md px-3 py-1">
                <span className="text-xs text-muted-foreground">app.quoteflow.io/quotations/new</span>
              </div>
            </div>
            {/* App content */}
            <div className="grid md:grid-cols-[200px_1fr] divide-x divide-border/40">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col gap-1 p-4 bg-muted/20">
                {[
                  { label: "Dashboard", icon: <BarChart className="w-4 h-4" /> },
                  { label: "Quotations", icon: <FileText className="w-4 h-4" />, active: true },
                  { label: "Clients", icon: <Users className="w-4 h-4" /> },
                  { label: "Settings", icon: <Settings className="w-4 h-4" /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      item.active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>
              {/* Main panel */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">New Quotation</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground border border-border/50 rounded-md px-2 py-1">SGD</span>
                    <Button size="sm" className="rounded-lg text-xs h-7 px-3">+ Add Item</Button>
                  </div>
                </div>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span>Description</span><span>Qty</span><span>Unit Price</span><span className="text-right">Total</span>
                  </div>
                  {[
                    { desc: "Network Setup & Configuration", qty: 1, price: "SGD 1,680", total: "SGD 1,680" },
                    { desc: "Cloud Migration (AWS)", qty: 3, price: "SGD 1,190", total: "SGD 3,570" },
                    { desc: "Security Audit & Report", qty: 1, price: "SGD 3,360", total: "SGD 3,360" },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-3 text-sm border-t border-border/30 items-center">
                      <span className="text-foreground font-medium">{row.desc}</span>
                      <span className="text-muted-foreground">{row.qty}</span>
                      <span className="text-muted-foreground">{row.price}</span>
                      <span className="text-right text-primary font-semibold">{row.total}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end items-center gap-4 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
                  <span className="text-sm text-muted-foreground">Subtotal SGD 8,610 · GST 9%</span>
                  <span className="text-lg font-bold text-foreground">Total: SGD 9,385.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SOCIAL PROOF
      ═══════════════════════════════════════ */}
      <section className="py-10 border-y border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-widest">
            Trusted by leading managed service providers
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
            <div className="text-xl font-bold font-serif tracking-tighter">AcmeTech</div>
            <div className="text-xl font-bold tracking-widest">NEXUS<span className="font-light">IT</span></div>
            <div className="text-xl font-bold italic">SysGuard</div>
            <div className="text-xl font-black">CloudBridge</div>
            <div className="text-xl font-medium tracking-tight">Overture <span className="text-primary">Systems</span></div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          USER JOURNEY — 4 STEPS
      ═══════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">The Journey</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            From blank page to<br className="hidden md:block" /> paid invoice.
          </h2>
          <p className="text-lg text-muted-foreground">
            Four effortless steps. No spreadsheets, no back-and-forth, no chasing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              icon: <PenTool className="w-6 h-6" />,
              title: "Create",
              desc: "Add your IT services as line items. Set quantities and pricing. The live total updates as you type.",
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              step: "02",
              icon: <Layers className="w-6 h-6" />,
              title: "Brand It",
              desc: "Upload your logo, pick a template — Modern or Classic — and generate a pixel-perfect PDF in seconds.",
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              step: "03",
              icon: <Send className="w-6 h-6" />,
              title: "Send the Link",
              desc: "Share a quote link with your client. They see everything — services, pricing, totals — instantly.",
              color: "text-sky-600",
              bg: "bg-sky-50",
            },
            {
              step: "04",
              icon: <CreditCard className="w-6 h-6" />,
              title: "Get Paid",
              desc: "Attach a Stripe payment link to your quote. Client approves and pays — all in one seamless flow.",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ].map((item, i) => (
            <div key={i} className="relative group">
              {/* Connector line between steps */}
              {i < 3 && (
                <div className="hidden lg:block absolute top-10 left-[calc(100%_-_12px)] w-6 z-10">
                  <ChevronRight className="w-5 h-5 text-border" />
                </div>
              )}
              <div className="bg-background border border-border/50 rounded-2xl p-7 h-full hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className={`${item.bg} w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className="text-4xl font-black text-muted-foreground/15 tabular-nums">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          EASE OF USE SPOTLIGHT
      ═══════════════════════════════════════ */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">Ease of Use</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
                Professional quotes.<br />
                <span className="text-primary">Under 2 minutes.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                No training needed. No clunky UI. QuoteFlow is so intuitive your first quote is ready before your coffee cools down.
              </p>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full">
                <Zap className="w-4 h-4" />
                Faster than any spreadsheet
              </div>
            </div>

            {/* Right: step-through visual */}
            <div className="bg-background border border-border/50 rounded-2xl p-8 shadow-sm space-y-0 divide-y divide-border/40">
              {[
                {
                  n: "1",
                  title: "Pick your client",
                  desc: "Select from your client database or create a new one. Details auto-fill.",
                },
                {
                  n: "2",
                  title: "Add line items",
                  desc: "Type each service, quantity, and rate. Totals calculate live — no formulas.",
                },
                {
                  n: "3",
                  title: "Choose your currency",
                  desc: "Multi-currency built-in. Quote in USD, EUR, SGD, MYR or any currency.",
                },
                {
                  n: "4",
                  title: "Send & track",
                  desc: "Share PDF or quote link. Watch status move Draft → Sent → Accepted → Paid.",
                },
              ].map((step, i) => (
                <div key={i} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {step.n}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">{step.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          MULTI-CURRENCY SPOTLIGHT
      ═══════════════════════════════════════ */}
      <section className="py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: currency mockup */}
          <div className="order-2 md:order-1">
            <div className="bg-background border border-border/50 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border/40">
                <div>
                  <p className="font-semibold text-foreground text-sm">Q-2026-0042 — Nexus Digital</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cloud Migration Package</p>
                </div>
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold px-3 py-1.5 rounded-lg">
                  <Globe className="w-3.5 h-3.5" />
                  SGD ▾
                </div>
              </div>
              {/* Line items */}
              <div className="divide-y divide-border/30">
                {[
                  { desc: "Network Infrastructure Setup", amount: "SGD 1,680.00" },
                  { desc: "Cloud Migration (AWS) × 3",   amount: "SGD 3,570.00" },
                  { desc: "Security Audit & Compliance",  amount: "SGD 3,360.00" },
                  { desc: "GST 9%",                       amount: "SGD 772.20",  muted: true },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center px-6 py-3.5 text-sm">
                    <span className={row.muted ? "text-muted-foreground" : "text-foreground"}>{row.desc}</span>
                    <span className={`font-semibold tabular-nums ${row.muted ? "text-muted-foreground" : "text-foreground"}`}>{row.amount}</span>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div className="flex justify-between items-center px-6 py-4 bg-primary/5 border-t border-primary/15">
                <span className="text-sm font-semibold text-foreground">Total Amount</span>
                <span className="text-2xl font-bold text-primary tabular-nums">SGD 9,382.20</span>
              </div>
            </div>

            {/* Currency pill strip */}
            <div className="flex flex-wrap gap-2 mt-4">
              {["🇺🇸 USD", "🇪🇺 EUR", "🇸🇬 SGD", "🇲🇾 MYR", "🇦🇺 AUD", "🇬🇧 GBP"].map((c) => (
                <span key={c} className="text-xs font-medium bg-muted/50 border border-border/50 rounded-full px-3 py-1.5 text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Right: text */}
          <div className="order-1 md:order-2">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">Multi-Currency</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
              Your clients are<br />
              <span className="text-primary">global.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Quote in any currency — USD, EUR, SGD, MYR and more. Switch in one
              click. Your clients see exactly what they owe, in money they
              understand.
            </p>
            <ul className="space-y-3">
              {[
                "Switch currency per quote with a single click",
                "Currency stored per client for repeat quoting",
                "Totals, taxes, and subtotals all auto-update",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-foreground/90 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PAYMENT LINK SPOTLIGHT
      ═══════════════════════════════════════ */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">Integrated Payments</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
                Don't just send<br />a quote. Send a<br />
                <span className="text-primary">way to pay.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Attach a Stripe payment link directly to your quotation. Your
                client reviews, approves, and pays — all without leaving the
                page.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Powered by Stripe — the world's most trusted payments platform",
                  "Payment status syncs to your dashboard automatically",
                  "Quote moves to PAID the moment funds clear",
                  "No extra setup — Stripe is built right in",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-foreground/90 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: payment card mockup */}
            <div className="space-y-4">
              {/* Quote card */}
              <div className="bg-background border border-border/50 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary/10 text-primary p-2 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Accepted
                  </span>
                </div>
                <p className="font-bold text-foreground mb-0.5">Nexus Digital Solutions</p>
                <p className="text-sm text-muted-foreground mb-4">IT Services Proposal · Q-2026-0042 · May 2026</p>
                <p className="text-3xl font-bold text-foreground mb-1">SGD 9,382.20</p>
                <p className="text-sm text-muted-foreground mb-5">3 line items · GST 9% included</p>
                <Button className="w-full h-12 rounded-xl text-sm font-semibold">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now with Stripe
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  🔒 Secured by Stripe · 256-bit SSL encryption
                </p>
              </div>

              {/* Payment confirmation */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
                <div className="bg-emerald-100 border border-emerald-300 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">Payment Received</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Quote status → PAID · Dashboard updated instantly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════ */}
      <section id="features" className="py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Everything you need to win the job.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We've stripped away the bloat of traditional CRMs and focused entirely on the quoting experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <FileText className="w-6 h-6 text-primary" />,
              title: "Professional PDF Generation",
              desc: "Automatically generate pixel-perfect, branded PDF quotes — Modern or Classic template — that command trust and justify your rates.",
            },
            {
              icon: <Settings className="w-6 h-6 text-primary" />,
              title: "Complex Line Items",
              desc: "Handle quantities, units, per-item pricing, optional taxes, and line-item discounts with ease.",
            },
            {
              icon: <Zap className="w-6 h-6 text-primary" />,
              title: "Status Tracking",
              desc: "Know exactly what's happening. Track your quotes from Draft → Sent → Accepted → Paid in real time.",
            },
            {
              icon: <CreditCard className="w-6 h-6 text-primary" />,
              title: "Integrated Payments",
              desc: "Attach a Stripe payment link directly to your quote. Your client approves and pays in one seamless flow.",
            },
            {
              icon: <Globe className="w-6 h-6 text-primary" />,
              title: "Multi-Currency Support",
              desc: "Quote in USD, EUR, SGD, MYR, GBP and more. Switch currency per quote with a single click.",
            },
            {
              icon: <Users className="w-6 h-6 text-primary" />,
              title: "Client Management",
              desc: "Keep a centralised record of contacts, quoting history, and billing details — all in one place.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-background border border-border/50 rounded-2xl p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PDF TEMPLATES SECTION
      ═══════════════════════════════════════ */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">PDF Templates</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Stunning by default.</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Two beautifully crafted templates. Your brand, your logo, your first impression.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Modern Template */}
            <div className="bg-background border border-border/50 rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
              {/* PDF Preview */}
              <div className="p-6 pb-0 bg-gradient-to-b from-primary/5 to-background">
                <div className="bg-white border border-border/30 rounded-xl p-6 shadow-sm min-h-[260px]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg" />
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest">Quotation</p>
                      <p className="text-xs font-bold text-gray-800">Q-2026-0042</p>
                    </div>
                  </div>
                  <p className="text-base font-black text-gray-900 tracking-tight mb-0.5">Nexus Digital</p>
                  <p className="text-[9px] text-gray-400 mb-3">Cloud Migration Package · Issued 09 May 2026</p>
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {["Network Setup", "Cloud Migration × 3", "Security Audit"].map((item, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-gray-700">
                        <span>{item}</span>
                        <span className="font-semibold">{["$1,200", "$2,550", "$2,400"][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t border-gray-100 text-xs font-bold text-gray-900">
                    <span>TOTAL</span><span>$6,703.50</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <p className="font-bold text-foreground">Modern</p>
                  <p className="text-sm text-muted-foreground">Clean lines, bold type, blue accents</p>
                </div>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">Modern</span>
              </div>
            </div>

            {/* Classic Template */}
            <div className="bg-background border border-border/50 rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
              {/* PDF Preview */}
              <div className="p-6 pb-0 bg-gradient-to-b from-muted/30 to-background">
                <div className="bg-[#fafaf8] border border-border/30 rounded-xl p-6 shadow-sm min-h-[260px]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-9 h-9 bg-gray-900 rounded-sm" />
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 italic" style={{ fontFamily: "Georgia, serif" }}>Quotation</p>
                      <p className="text-xs font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>Q-2026-0042</p>
                    </div>
                  </div>
                  <p className="text-base font-black text-gray-900 mb-0.5" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>Nexus Digital</p>
                  <p className="text-[9px] text-gray-400 mb-3 italic" style={{ fontFamily: "Georgia, serif" }}>Cloud Migration Package · Issued 09 May 2026</p>
                  <div className="border-t-2 border-gray-900 pt-3 space-y-2">
                    {["Network Setup", "Cloud Migration × 3", "Security Audit"].map((item, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-gray-700">
                        <span>{item}</span>
                        <span className="font-semibold">{["$1,200", "$2,550", "$2,400"][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-2 border-t border-gray-300 text-xs font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
                    <span>TOTAL</span><span>$6,703.50</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <p className="font-bold text-foreground">Classic</p>
                  <p className="text-sm text-muted-foreground">Elegant serif typography, timeless formality</p>
                </div>
                <span className="text-xs font-semibold bg-muted border border-border/50 text-muted-foreground px-3 py-1 rounded-full">Classic</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PRICING
      ═══════════════════════════════════════ */}
      <PricingSection />

      {/* ═══════════════════════════════════════
          FAQ
      ═══════════════════════════════════════ */}
      <section id="faq" className="py-24 max-w-3xl mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Common questions.</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {[
            {
              q: "Can I try QuoteFlow before paying?",
              a: "Yes — you can sign up and explore the app completely free before adding a payment method. Create quotes, manage clients, and test every feature at your own pace.",
            },
            {
              q: "Which currencies are supported?",
              a: "QuoteFlow supports all major currencies including USD, EUR, GBP, AUD, SGD, MYR and many more. You can set a default currency per client and switch on any individual quote.",
            },
            {
              q: "How does the Stripe payment link work?",
              a: "When your client accepts a quote, you can attach a Stripe-powered payment link directly to it. They click, enter card details, and pay — QuoteFlow automatically marks the quote as PAID and updates your dashboard.",
            },
            {
              q: "What PDF templates are available?",
              a: "QuoteFlow includes two professionally designed templates: Modern (clean lines, blue accents, contemporary layout) and Classic (elegant serif typography, formal structure). Both are fully branded with your company logo.",
            },
            {
              q: "Can I cancel at any time?",
              a: "Absolutely. No long-term contracts. Cancel your subscription at any time from your billing settings — you won't be charged for the next billing period and your data stays accessible until the end of your current cycle.",
            },
          ].map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-border/50 rounded-xl px-6 bg-background"
              data-testid={`faq-item-${i}`}
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ═══════════════════════════════════════
          BOTTOM CTA
      ═══════════════════════════════════════ */}
      <section className="py-32 px-4 md:px-6 bg-primary text-primary-foreground text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-50" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-[1.05]">
            Your next quote is<br />one click away.
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto leading-relaxed">
            Join IT professionals who've ditched the spreadsheet and never looked back.
          </p>
          <a href="/sign-up">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-base rounded-full font-semibold">
              Create your first quote
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <p className="mt-6 text-sm text-primary-foreground/60">
            No credit card required · Cancel anytime · Free to try
          </p>
        </div>
      </section>

    </MarketingLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PRICING SECTION — unchanged; fetches live prices from Stripe API
═══════════════════════════════════════════════════════════════════ */
function PricingSection() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [pricing, setPricing] = useState({
    daily:   { amount: 2.99,   label: "/day",   desc: "For occasional use" },
    weekly:  { amount: 9.99,   label: "/week",  desc: "For short projects" },
    monthly: { amount: 29.99,  label: "/month", desc: "Most popular" },
    yearly:  { amount: 199.99, label: "/year",  desc: "Best value (saves ~44%)" },
  });

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.length) {
          const updated = { ...pricing };
          for (const price of data.data) {
            const interval = price.recurring?.interval as string;
            const amount = price.unit_amount / 100;
            if (interval === "day")   updated.daily   = { ...updated.daily,   amount };
            else if (interval === "week")  updated.weekly  = { ...updated.weekly,  amount };
            else if (interval === "month") updated.monthly = { ...updated.monthly, amount };
            else if (interval === "year")  updated.yearly  = { ...updated.yearly,  amount };
          }
          setPricing(updated);
        }
      })
      .catch(() => {
        // Fall back to hardcoded pricing
      });
  }, []);

  const handleSubscribe = async (plan: "daily" | "weekly" | "monthly" | "yearly") => {
    if (typeof window === "undefined") return;
    setLoadingPlan(plan);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-24 max-w-5xl mx-auto px-4 md:px-6">
      <div className="text-center mb-16">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Pricing</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Simple, transparent pricing.</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Pay for exactly what you need. Upgrade or downgrade at any time.
        </p>
        <div className="inline-flex bg-muted/50 p-1.5 rounded-full border border-border/50 overflow-x-auto max-w-full">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              data-testid={`billing-toggle-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                period === p
                  ? "bg-background shadow-sm border border-border/50 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="bg-background border border-border rounded-3xl p-8 shadow-sm flex flex-col relative overflow-hidden">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">QuoteFlow Pro</h3>
            <p className="text-muted-foreground">{pricing[period].desc}</p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-bold tracking-tight">${pricing[period].amount.toFixed(2)}</span>
            <span className="text-muted-foreground font-medium">{pricing[period].label}</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {[
              "Unlimited PDF quotes",
              "Unlimited line items",
              "Status tracking pipeline",
              "Client CRM integration",
              "Multi-currency support",
              "Payment link integration",
              "Modern & Classic PDF templates",
              "Remove QuoteFlow branding",
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground/90 font-medium">{f}</span>
              </li>
            ))}
          </ul>
          <Button
            className="w-full h-12 rounded-xl text-base font-semibold"
            data-testid={`subscribe-${period}`}
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe(period)}
          >
            {loadingPlan === period ? <Loader2 className="w-5 h-5 animate-spin" /> : "Subscribe"}
          </Button>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 flex flex-col justify-center text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Need an Enterprise plan?</h3>
          <p className="text-muted-foreground mb-8">
            For large MSPs needing multi-user access, custom API integrations, and advanced reporting.
          </p>
          <Button variant="outline" className="w-full h-12 rounded-xl text-base font-semibold bg-background">
            Contact sales
          </Button>
        </div>
      </div>
    </section>
  );
}
