import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const eventColors = [
	"blue",
	"green",
	"red",
	"yellow",
	"purple",
	"orange",
] as const;

export type EventColor = (typeof eventColors)[number];

export const events = pgTable(
	"events",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		startAt: timestamp("start_at", { withTimezone: true }).notNull(),
		endAt: timestamp("end_at", { withTimezone: true }).notNull(),
		color: text("color", { enum: eventColors }).notNull(),
		providerId: text("provider_id"),
		providerName: text("provider_name"),
		clinicId: text("clinic_id"),
		clinicName: text("clinic_name"),
		isVideoConsultation: boolean("is_video_consultation").notNull().default(false),
		videoLink: text("video_link"),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(t) => [
		check(
			"events_color_check",
			sql`${t.color} IN ('blue', 'green', 'red', 'yellow', 'purple', 'orange')`,
		),
		index("idx_events_active_range").on(t.startAt, t.endAt),
		index("idx_events_deleted_at").on(t.deletedAt),
	],
);
