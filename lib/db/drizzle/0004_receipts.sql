CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"invoice_id" text NOT NULL,
	"user_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp NOT NULL,
	"payment_method" text DEFAULT 'manual' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"client_snapshot" json,
	"company_snapshot" json,
	"line_items_snapshot" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
CREATE INDEX "receipts_user_id_idx" ON "receipts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "receipts_invoice_id_idx" ON "receipts" USING btree ("invoice_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_user_id_number_uidx" ON "receipts" USING btree ("user_id","number");
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
