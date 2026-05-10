import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Checking for existing KuotFlow products...');

    const existing = await stripe.products.search({
      query: "name:'KuotFlow Pro' AND active:'true'",
    });

    if (existing.data.length > 0) {
      console.log('KuotFlow Pro product already exists — listing existing prices:');
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      for (const p of prices.data) {
        const rec = p.recurring;
        console.log(`  ${rec?.interval}: ${p.id} — ${(p.unit_amount ?? 0) / 100} ${p.currency.toUpperCase()}`);
      }
      return;
    }

    console.log('Creating KuotFlow Pro product...');
    const product = await stripe.products.create({
      name: 'KuotFlow Pro',
      description: 'Professional IT quotation management platform',
      metadata: { app: 'kuotflow' },
    });
    console.log(`Created product: ${product.id}`);

    const plans = [
      { interval: 'day' as const, amount: 299, label: 'Daily — $2.99/day' },
      { interval: 'week' as const, amount: 999, label: 'Weekly — $9.99/week' },
      { interval: 'month' as const, amount: 2999, label: 'Monthly — $29.99/month' },
      { interval: 'year' as const, amount: 19999, label: 'Yearly — $199.99/year' },
    ];

    for (const plan of plans) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: 'usd',
        recurring: { interval: plan.interval },
        metadata: { plan: plan.interval },
      });
      console.log(`  Created price: ${plan.label} → ${price.id}`);
    }

    console.log('\nAll pricing tiers created successfully!');
    console.log('Webhooks will sync this data to the database automatically.');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error creating products:', msg);
    process.exit(1);
  }
}

createProducts();
