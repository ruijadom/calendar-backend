import { z } from "zod";

const colorEnum = z.enum([
	"blue",
	"green",
	"red",
	"yellow",
	"purple",
	"orange",
]);

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export const assertValidEventRange = (
	start: Date,
	end: Date,
): { ok: true } | { ok: false; message: string } => {
	if (!(end.getTime() > start.getTime())) {
		return { ok: false, message: "endDate must be after startDate" };
	}
	const duration = end.getTime() - start.getTime();
	if (duration < MIN_DURATION_MS) {
		return { ok: false, message: "Event duration must be at least 15 minutes" };
	}
	if (duration > MAX_DURATION_MS) {
		return { ok: false, message: "Event duration must be at most 24 hours" };
	}
	return { ok: true };
};

export const createEventBodySchema = z
	.object({
		title: z.string().min(1),
		description: z.string().min(1),
		startDate: z.string().datetime({ offset: true }),
		endDate: z.string().datetime({ offset: true }),
		color: colorEnum,
		providerId: z.string().optional().nullable(),
		providerName: z.string().optional().nullable(),
		clinicId: z.string().optional().nullable(),
		clinicName: z.string().optional().nullable(),
		isVideoConsultation: z.boolean().optional().default(false),
		videoLink: z
			.union([z.string().url(), z.literal("")])
			.optional()
			.nullable()
			.transform((v) => (v === "" ? undefined : v)),
		metadata: z.record(z.unknown()).optional().default({}),
	})
	.superRefine((data, ctx) => {
		const start = new Date(data.startDate);
		const end = new Date(data.endDate);
		const range = assertValidEventRange(start, end);
		if (!range.ok) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: range.message,
				path: ["endDate"],
			});
		}
		if (data.isVideoConsultation) {
			const link =
				typeof data.videoLink === "string" ? data.videoLink.trim() : "";
			if (!link) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "videoLink is required when isVideoConsultation is true",
					path: ["videoLink"],
				});
			}
		}
	});

export const patchEventBodySchema = z
	.object({
		title: z.string().min(1).optional(),
		description: z.string().min(1).optional(),
		startDate: z.string().datetime({ offset: true }).optional(),
		endDate: z.string().datetime({ offset: true }).optional(),
		color: colorEnum.optional(),
		providerId: z.string().optional().nullable(),
		providerName: z.string().optional().nullable(),
		clinicId: z.string().optional().nullable(),
		clinicName: z.string().optional().nullable(),
		isVideoConsultation: z.boolean().optional(),
		videoLink: z
			.union([z.string().url(), z.literal("")])
			.optional()
			.nullable()
			.transform((v) => (v === "" ? undefined : v)),
		metadata: z.record(z.unknown()).optional(),
	})
	.strict();

export type CreateEventBody = z.infer<typeof createEventBodySchema>;
export type PatchEventBody = z.infer<typeof patchEventBodySchema>;
