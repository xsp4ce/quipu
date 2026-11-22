ALTER TABLE "categories" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "currencies" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_accounts" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_credit_limit_check" CHECK ("credit_card_details"."credit_limit_cents" > 0);--> statement-breakpoint
ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_statement_day_check" CHECK ("credit_card_details"."statement_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_payment_due_day_check" CHECK ("credit_card_details"."payment_due_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_currencies_check" CHECK (cardinality("financial_accounts"."currencies") between 1 and 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_type_check" CHECK ("transactions"."type" in ('expense', 'income', 'transfer_out', 'transfer_in', 'opening_balance'));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_sign_check" CHECK (("transactions"."type" in ('income', 'transfer_in') and "transactions"."amount_cents" > 0)
				or ("transactions"."type" in ('expense', 'transfer_out') and "transactions"."amount_cents" < 0)
				or ("transactions"."type" = 'opening_balance' and "transactions"."amount_cents" <> 0));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_check" CHECK (("transactions"."type" in ('expense', 'income')) = ("transactions"."category_id" is not null));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_check" CHECK ("transactions"."type" not in ('transfer_out', 'transfer_in') or "transactions"."transfer_id" is not null);--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_exchange_rate_check" CHECK ("transfers"."exchange_rate" is null or "transfers"."exchange_rate" > 0);