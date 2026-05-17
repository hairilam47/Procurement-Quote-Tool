import { MarketingLayout } from "@/components/layout/marketing-layout";

export default function Terms() {
  return (
    <MarketingLayout>
      <section className="container mx-auto px-4 md:px-6 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 17, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using KuotFlow ("Service"), you agree to be bound by these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              KuotFlow is a web-based quotation management platform for IT service providers. It
              allows users to create, send, and track professional quotations and invoices. Features
              are subject to change with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Account Registration</h2>
            <p>
              You must provide accurate information when registering. You are responsible for
              maintaining the confidentiality of your credentials and for all activity under your
              account. Notify us immediately at{" "}
              <a href="mailto:support@kuotflow.com" className="underline">support@kuotflow.com</a>{" "}
              if you suspect unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Subscriptions and Billing</h2>
            <p>
              Paid plans are billed in advance on the cycle you select (daily, weekly, monthly, or
              yearly). Payments are processed via Stripe. Subscriptions renew automatically unless
              cancelled before the renewal date. Refunds are not provided for partial periods, except
              where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorised access to our systems</li>
              <li>Transmit spam, malware, or other harmful content</li>
              <li>Reverse-engineer or copy the Service</li>
              <li>Resell or sublicense access without written permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Intellectual Property</h2>
            <p>
              KuotFlow and its underlying software, design, and branding are owned by us. You retain
              ownership of all quotation data and client information you input into the Service.
              You grant us a limited licence to process that data solely to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, KuotFlow is provided "as is" without warranties
              of any kind. We are not liable for indirect, incidental, or consequential damages arising
              from your use of the Service. Our total liability shall not exceed the amount you paid us
              in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Termination</h2>
            <p>
              You may cancel your account at any time from the billing settings. We may suspend or
              terminate accounts that violate these Terms with reasonable notice, or immediately
              where there is a risk of harm to the Service or other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes at
              least 14 days in advance. Continued use after the effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes shall be
              subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Contact</h2>
            <p>
              Questions about these Terms? Email us at{" "}
              <a href="mailto:legal@kuotflow.com" className="underline">legal@kuotflow.com</a>.
            </p>
          </section>
        </div>
      </section>
    </MarketingLayout>
  );
}
