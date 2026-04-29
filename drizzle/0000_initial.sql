CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"color" text NOT NULL,
	"provider_id" text,
	"provider_name" text,
	"clinic_id" text,
	"clinic_name" text,
	"is_video_consultation" boolean DEFAULT false NOT NULL,
	"video_link" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "events_color_check" CHECK ("events"."color" IN ('blue', 'green', 'red', 'yellow', 'purple', 'orange'))
);
