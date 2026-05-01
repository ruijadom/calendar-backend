/** JSON Schema fragments for OpenAPI route `schema` (Fastify + Swagger). */

export const colorEnum = {
	type: "string",
	enum: ["blue", "green", "red", "yellow", "purple", "orange"],
};

export const statusEnum = {
	type: "string",
	enum: ["pending", "confirmed", "canceled"],
};

export const apiEventSchema = {
	type: "object",
	description: "Calendar event (camelCase JSON)",
	properties: {
		id: { type: "string", format: "uuid" },
		title: { type: "string" },
		description: { type: "string" },
		startDate: { type: "string", format: "date-time" },
		endDate: { type: "string", format: "date-time" },
		color: colorEnum,
		providerId: { type: ["string", "null"] },
		providerName: { type: ["string", "null"] },
		clinicId: { type: ["string", "null"] },
		clinicName: { type: ["string", "null"] },
		status: statusEnum,
		isVideoConsultation: { type: "boolean" },
		videoLink: { type: ["string", "null"] },
		metadata: { type: "object", additionalProperties: true },
		createdAt: { type: "string", format: "date-time" },
		updatedAt: { type: "string", format: "date-time" },
		deletedAt: { type: ["string", "null"] },
	},
	required: [
		"id",
		"title",
		"description",
		"startDate",
		"endDate",
		"color",
		"status",
		"isVideoConsultation",
		"metadata",
		"createdAt",
		"updatedAt",
	],
};

export const apiErrorSchema = {
	type: "object",
	properties: {
		error: {
			type: "object",
			properties: {
				code: { type: "string" },
				message: { type: "string" },
				details: {
					type: "array",
					items: {
						type: "object",
						properties: {
							field: { type: "string" },
							message: { type: "string" },
						},
					},
				},
			},
			required: ["code", "message"],
		},
	},
	required: ["error"],
};

export const listEventsQuerySchema = {
	type: "object",
	required: ["startDate", "endDate"],
	properties: {
		startDate: {
			type: "string",
			format: "date-time",
			description: "Range start (ISO 8601, inclusive overlap logic)",
		},
		endDate: { type: "string", format: "date-time" },
	},
};

export const listEventsResponseSchema = {
	type: "object",
	properties: {
		data: { type: "array", items: apiEventSchema },
		pagination: {
			type: "object",
			properties: {
				page: { type: "number" },
				limit: { type: "number" },
				total: { type: "number" },
				totalPages: { type: "number" },
			},
		},
	},
};

export const uuidParamSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: { type: "string", format: "uuid" },
	},
};

/** POST /api/v1/events — Fastify/AJV validates (no `example` — strict mode rejects it). */
export const createEventRequestBodySchema = {
	type: "object",
	required: ["title", "description", "startDate", "endDate", "color"],
	properties: {
		title: { type: "string", minLength: 1 },
		description: { type: "string", minLength: 1 },
		startDate: {
			type: "string",
			format: "date-time",
		},
		endDate: {
			type: "string",
			format: "date-time",
		},
		color: colorEnum,
		providerId: { type: ["string", "null"] },
		providerName: { type: ["string", "null"] },
		clinicId: { type: ["string", "null"] },
		clinicName: { type: ["string", "null"] },
		status: statusEnum,
		isVideoConsultation: { type: "boolean" },
		videoLink: { type: ["string", "null"] },
		metadata: { type: "object", additionalProperties: true },
	},
};
