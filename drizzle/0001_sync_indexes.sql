CREATE INDEX "idx_events_active_range" ON "events" USING btree ("start_at","end_at");
--> statement-breakpoint
CREATE INDEX "idx_events_deleted_at" ON "events" USING btree ("deleted_at");