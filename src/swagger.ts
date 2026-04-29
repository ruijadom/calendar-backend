import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

const serverUrl =
	process.env.PUBLIC_API_URL?.trim() ||
	`http://localhost:${process.env.PORT || 3001}`;

/** Call first — collects route schemas for OpenAPI. */
export const registerOpenApi = async (app: FastifyInstance): Promise<void> => {
	await app.register(swagger, {
		openapi: {
			openapi: "3.1.0",
			info: {
				title: "Calendar API",
				description:
					"REST + SSE for the Communicator appointments calendar (single-tenant MVP). Request bodies are validated in handlers (Zod); see examples in each operation.",
				version: "1.0.0",
			},
			servers: [{ url: serverUrl, description: "This deployment" }],
			tags: [
				{ name: "system", description: "Health" },
				{ name: "events", description: "Calendar events" },
				{ name: "realtime", description: "Server-Sent Events" },
			],
			components: {
				securitySchemes: {
					apiKeyHeader: {
						type: "apiKey",
						in: "header",
						name: "X-API-Key",
						description:
							"Set when the server defines `API_KEY`. For SSE, use query `apiKey` (EventSource cannot send headers).",
					},
				},
				schemas: {
					ApiEvent: {
						type: "object",
						properties: {
							id: { type: "string", format: "uuid" },
							title: { type: "string" },
							description: { type: "string" },
							startDate: { type: "string", format: "date-time" },
							endDate: { type: "string", format: "date-time" },
							color: {
								type: "string",
								enum: [
									"blue",
									"green",
									"red",
									"yellow",
									"purple",
									"orange",
								],
							},
							providerId: { type: ["string", "null"] },
							providerName: { type: ["string", "null"] },
							clinicId: { type: ["string", "null"] },
							clinicName: { type: ["string", "null"] },
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
							"isVideoConsultation",
							"metadata",
							"createdAt",
							"updatedAt",
						],
					},
					ApiError: {
						type: "object",
						properties: {
							error: {
								type: "object",
								properties: {
									code: { type: "string" },
									message: { type: "string" },
								},
								required: ["code", "message"],
							},
						},
						required: ["error"],
					},
				},
			},
		},
	});
};

/** Call after all routes are registered — serves UI + `/documentation/json`. */
export const registerOpenApiUi = async (app: FastifyInstance): Promise<void> => {
	await app.register(swaggerUi, {
		routePrefix: "/documentation",
		uiConfig: {
			docExpansion: "list",
			deepLinking: true,
		},
		staticCSP: true,
		transformStaticCSP: (header) => header,
	});
};
