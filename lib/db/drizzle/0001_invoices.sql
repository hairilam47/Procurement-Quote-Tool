CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
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
	"paid_at" timestamp,
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
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
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "invoices_number_idx" ON "invoices" USING btree ("number");
--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");
