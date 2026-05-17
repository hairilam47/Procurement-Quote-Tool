import { MarketingLayout } from "@/components/layout/marketing-layout";

export default function Privacy() {
  return (
    <MarketingLayout>
      <section className="container mx-auto px-4 md:px-6 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 17, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>
              We collect information you provide directly, such as your name, email address, and billing
              information when you create an account or subscribe to a plan. We also collect usage data
              automatically, including pages visited, features used, and device/browser information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide, maintain, and improve the KuotFlow service</li>
              <li>Process payments and manage your subscription</li>
              <li>Send transactional emails such as invoices and quotation notifications</li>
              <li>Respond to support requests and enquiries</li>
              <li>Monitor for fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Sharing</h2>
            <p>
              We do not sell your personal data. We share data only with trusted service providers
              (such as Stripe for payment processing and cloud infrastructure providers) strictly to
              operate the service, and as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. After account deletion
              we retain minimal records for up to 90 days for fraud prevention, then permanently delete
              your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Security</h2>
            <p>
              We use industry-standard encryption in transit (TLS) and at rest. Access to production
              systems is restricted to authorised personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p>
              You may access, correct, or delete your personal data at any time by contacting us at{" "}
              <a href="mailto:privacy@kuotflow.com" className="underline">privacy@kuotflow.com</a>.
              EU/UK residents have additional rights under GDPR/UK GDPR including data portability
              and the right to object to processing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Cookies</h2>
            <p>
              We use essential session cookies required for authentication and a small number of
              analytics cookies to understand aggregate usage. You may disable non-essential cookies
              in your browser settings at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We will notify you of material changes by
              email or via an in-app notice at least 14 days before they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Contact</h2>
            <p>
              Questions about this policy? Email us at{" "}
              <a href="mailto:privacy@kuotflow.com" className="underline">privacy@kuotflow.com</a>.
            </p>
          </section>
        </div>
      </section>
    </MarketingLayout>
  );
}
