CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"role" text DEFAULT 'ADMIN' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_account_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"name" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"region" text,
	"postal_code" text NOT NULL,
	"country" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"website" text,
	"tax_number" text,
	"registration_number" text,
	"logo_url" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"default_tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"default_terms" text,
	"default_notes" text,
	"default_template" text DEFAULT 'MODERN' NOT NULL,
	"default_payment_url" text,
	"bank_name" text,
	"bank_account_number" text,
	"bank_recipient_name" text,
	"bank_qr_code_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text NOT NULL,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"sku" text,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text DEFAULT 'hours' NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"rate_formula" text,
	"payment_required" boolean DEFAULT true NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp NOT NULL,
	"client_id" text NOT NULL,
	"client_snapshot" json,
	"company_snapshot" json,
	"currency" text DEFAULT 'USD' NOT NULL,
	"secondary_currency" text,
	"secondary_exchange_rate" numeric(18, 6),
	"discount_type" text,
	"discount_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"required_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"terms" text,
	"payment_url" text,
	"show_qr_code" boolean DEFAULT true NOT NULL,
	"payment_method" text DEFAULT 'none' NOT NULL,
	"template" text DEFAULT 'MODERN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"accepted_at" timestamp,
	"paid_at" timestamp,
	CONSTRAINT "quotations_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_email_idx" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "line_items_quotation_id_idx" ON "line_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotations_client_id_idx" ON "quotations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_number_idx" ON "quotations" USING btree ("number");