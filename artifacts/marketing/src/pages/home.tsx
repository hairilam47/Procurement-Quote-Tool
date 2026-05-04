import React, { useState, useEffect } from "react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, FileText, Settings, CreditCard, Users, Zap, Shield, Loader2, BarChart, Clock, PenTool } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 md:pt-32 pb-20 md:pb-32 px-4 md:px-6 max-w-7xl mx-auto w-full">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700">
            Stop losing hours to <br className="hidden md:block" />
            <span className="text-muted-foreground">messy Word quotes.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            QuoteFlow lets you create, send, and track professional, line-item PDF quotes in minutes. The precise quotation engine your MSP deserves.
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
      </section>

      {/* Social Proof / Logos */}
      <section className="py-10 border-y border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-6">TRUSTED BY LEADING MANAGED SERVICE PROVIDERS</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
            <div className="text-xl font-bold font-serif tracking-tighter">AcmeTech</div>
            <div className="text-xl font-bold tracking-widest">NEXUS<span className="font-light">IT</span></div>
            <div className="text-xl font-bold italic">SysGuard</div>
            <div className="text-xl font-black">CloudBridge</div>
            <div className="text-xl font-medium tracking-tight">Overture <span className="text-primary">Systems</span></div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">From draft to paid, faster.</h2>
          <p className="text-lg text-muted-foreground">
            A quoting pipeline designed to remove friction at every step of the sales process.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-border/50 -z-10" />

          {[
            {
              step: "01",
              title: "Create the quote",
              desc: "Add clients from your CRM, drag in saved line items, and adjust margins instantly.",
              icon: <PenTool className="w-6 h-6" />
            },
            {
              step: "02",
              title: "Send & track",
              desc: "Send the PDF directly. Get notified when they view it. Track status in your pipeline.",
              icon: <Clock className="w-6 h-6" />
            },
            {
              step: "03",
              title: "Sign & get paid",
              desc: "Clients accept with a digital signature and pay via embedded QR codes or links.",
              icon: <BarChart className="w-6 h-6" />
            }
          ].map((item, i) => (
            <div key={i} className="relative pt-8">
              <div className="w-12 h-12 bg-background border-2 border-primary text-primary rounded-full flex items-center justify-center font-bold text-lg absolute top-0 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0">
                {item.step}
              </div>
              <div className="text-center md:text-left mt-6">
                <div className="mb-4 inline-flex md:flex items-center justify-center md:justify-start w-12 h-12 rounded-xl bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-muted/30 border-y border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Everything you need to win the job.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We've stripped away the bloat of traditional CRMs and focused entirely on the quoting experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FileText className="w-6 h-6 text-primary" />,
                title: "Professional PDF Generation",
                desc: "Automatically generate pixel-perfect, branded PDF quotes that command trust and justify your rates."
              },
              {
                icon: <Settings className="w-6 h-6 text-primary" />,
                title: "Complex Line Items",
                desc: "Handle quantities, units, per-item pricing, optional taxes, and line-item discounts with ease."
              },
              {
                icon: <Zap className="w-6 h-6 text-primary" />,
                title: "Status Tracking",
                desc: "Know exactly what's happening. Track your quotes from Draft to Sent, Accepted, and Paid."
              },
              {
                icon: <CreditCard className="w-6 h-6 text-primary" />,
                title: "Integrated Payments",
                desc: "Generate QR codes and payment links directly on your quotes to get paid faster."
              },
              {
                icon: <Users className="w-6 h-6 text-primary" />,
                title: "Client Management",
                desc: "Keep a centralized record of contacts, quoting history, and recurring billing details."
              },
              {
                icon: <Shield className="w-6 h-6 text-primary" />,
                title: "Digital Signatures",
                desc: "Close deals instantly with secure, binding digital signatures directly from your clients."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-background border border-border/50 rounded-2xl p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-4 md:px-6 max-w-5xl mx-auto text-center">
        <div className="mb-8">
          <div className="flex justify-center gap-1 mb-6">
            {[1,2,3,4,5].map(star => <Zap key={star} className="w-5 h-5 text-primary fill-primary" />)}
          </div>
          <h2 className="text-2xl md:text-4xl font-medium leading-relaxed tracking-tight text-foreground/90">
            "QuoteFlow transformed how we present ourselves to clients. The quotes look incredible, and the ability to track status and collect payments on one platform saves us hours every week."
          </h2>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="w-12 h-12 bg-muted rounded-full overflow-hidden border border-border/50">
            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold">JD</div>
          </div>
          <div className="text-left">
            <div className="font-bold">James Dorsey</div>
            <div className="text-sm text-muted-foreground">CEO, SysGuard Managed IT</div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 md:px-6 max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Frequently asked questions</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know before getting started.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2" data-testid="faq-accordion">
          {[
            {
              q: "How does QuoteFlow compare to Word or Excel for quoting?",
              a: "Word and Excel are generic tools — they require manual formatting, offer no tracking, and are easy to lose. QuoteFlow is purpose-built: every quote is structured, branded, PDF-ready, and tracked from the moment you send it. You spend minutes, not hours."
            },
            {
              q: "Can I white-label the PDF quotes with my own branding?",
              a: "Yes. All QuoteFlow Pro plans let you add your company logo, brand colours, and custom footer text to every PDF. You can remove the QuoteFlow watermark and present fully branded documents to your clients."
            },
            {
              q: "What billing options are available?",
              a: "QuoteFlow offers flexible billing: Daily ($2.99), Weekly ($9.99), Monthly ($29.99), or Yearly ($199.99). The yearly plan saves you around 44% compared to monthly billing. You can upgrade, downgrade, or cancel at any time from your account settings."
            },
            {
              q: "Is there a free trial?",
              a: "QuoteFlow offers a generous free-tier to get you started. You can create your first quotes and explore the platform at no cost. When you're ready to unlock unlimited quotes, PDF generation, and client management, simply upgrade to a paid plan."
            },
            {
              q: "How do I get started?",
              a: "Click 'Start for free', create your account, and you'll be guided through setting up your company profile. You can create your first professional quote in under 5 minutes — no credit card required to begin."
            },
            {
              q: "Can I cancel my subscription at any time?",
              a: "Absolutely. There are no long-term contracts. You can cancel your subscription at any time from your billing settings and you won't be charged for the next billing period. Your data remains accessible until the end of your current billing cycle."
            }
          ].map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border/50 rounded-xl px-6 bg-background" data-testid={`faq-item-${i}`}>
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

      {/* Bottom CTA */}
      <section className="py-32 px-4 md:px-6 bg-primary text-primary-foreground text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-50" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Ready to upgrade your quoting workflow?</h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">
            Join hundreds of IT service providers who are closing deals faster and looking more professional.
          </p>
          <a href="/sign-up">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-base rounded-full font-semibold">
              Create your first quote
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}

function PricingSection() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [pricing, setPricing] = useState({
    daily: { amount: 2.99, label: "/day", desc: "For occasional use" },
    weekly: { amount: 9.99, label: "/week", desc: "For short projects" },
    monthly: { amount: 29.99, label: "/month", desc: "Most popular" },
    yearly: { amount: 199.99, label: "/year", desc: "Best value (saves ~44%)" }
  });

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then(res => res.json())
      .then(data => {
        if (data?.data?.length) {
          const updated = { ...pricing };
          for (const price of data.data) {
            const interval = price.recurring?.interval as string;
            const amount = price.unit_amount / 100;
            if (interval === "day") updated.daily = { ...updated.daily, amount };
            else if (interval === "week") updated.weekly = { ...updated.weekly, amount };
            else if (interval === "month") updated.monthly = { ...updated.monthly, amount };
            else if (interval === "year") updated.yearly = { ...updated.yearly, amount };
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
        body: JSON.stringify({ plan })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-24 max-w-5xl mx-auto px-4 md:px-6">
      <div className="text-center mb-16">
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
              "Remove QuoteFlow branding"
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
