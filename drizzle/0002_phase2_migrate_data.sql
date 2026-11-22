UPDATE "financial_accounts" SET "kind" = 'cash', "currencies" = ARRAY["currency"];--> statement-breakpoint
DELETE FROM "financial_accounts" a WHERE a."name" = 'Efectivo USD' AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."financial_account_id" = a."id");--> statement-breakpoint
UPDATE "financial_accounts" a SET "name" = 'Efectivo' WHERE a."name" = 'Efectivo PEN' AND NOT EXISTS (SELECT 1 FROM "financial_accounts" b WHERE b."user_id" = a."user_id" AND b."name" = 'Efectivo');--> statement-breakpoint
UPDATE "transactions" SET "amount_cents" = -"amount_cents" WHERE "type" = 'expense' AND "amount_cents" > 0;--> statement-breakpoint
INSERT INTO "categories" ("user_id", "kind", "name", "sort_order")
SELECT u."id", 'income', c."name", c."sort_order"
FROM "user" u
CROSS JOIN (VALUES ('Sueldo', 1), ('Freelance', 2), ('Devoluciones', 3), ('Otros', 4)) AS c("name", "sort_order")
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "user_settings" ("user_id") SELECT "id" FROM "user" ON CONFLICT DO NOTHING;
