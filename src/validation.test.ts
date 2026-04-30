import { describe, expect, it } from "vitest";
import {
	assertValidEventRange,
	createEventBodySchema,
	patchEventBodySchema,
} from "./validation";

describe("assertValidEventRange", () => {
	it("rejects end before start", () => {
		const r = assertValidEventRange(new Date("2026-04-30T12:00:00Z"), new Date("2026-04-30T11:00:00Z"));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toContain("after");
	});

	it("rejects duration under 15 minutes", () => {
		const r = assertValidEventRange(
			new Date("2026-04-30T10:00:00Z"),
			new Date("2026-04-30T10:14:59Z"),
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toContain("15");
	});

	it("accepts exactly 15 minutes", () => {
		const r = assertValidEventRange(
			new Date("2026-04-30T10:00:00Z"),
			new Date("2026-04-30T10:15:00Z"),
		);
		expect(r).toEqual({ ok: true });
	});

	it("rejects duration over 24 hours", () => {
		const r = assertValidEventRange(
			new Date("2026-04-30T10:00:00Z"),
			new Date("2026-05-02T10:00:01Z"),
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toContain("24");
	});
});

describe("createEventBodySchema", () => {
	const validBase = {
		title: "Patient",
		description: "Notes",
		startDate: "2026-04-30T10:00:00.000Z",
		endDate: "2026-04-30T10:30:00.000Z",
		color: "blue" as const,
	};

	it("parses minimal valid body", () => {
		const r = createEventBodySchema.safeParse(validBase);
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.isVideoConsultation).toBe(false);
			expect(r.data.metadata).toEqual({});
		}
	});

	it("rejects invalid color", () => {
		const r = createEventBodySchema.safeParse({ ...validBase, color: "pink" });
		expect(r.success).toBe(false);
	});

	it("requires videoLink when isVideoConsultation is true", () => {
		const r = createEventBodySchema.safeParse({
			...validBase,
			isVideoConsultation: true,
			videoLink: "",
		});
		expect(r.success).toBe(false);
	});

	it("accepts video link identifier", () => {
		const r = createEventBodySchema.safeParse({
			...validBase,
			isVideoConsultation: true,
			videoLink: "m-ad66771e471948c6b73a020af8b37799",
		});
		expect(r.success).toBe(true);
	});

	it("rejects datetime without offset (Z or ±hh:mm required)", () => {
		const r = createEventBodySchema.safeParse({
			...validBase,
			startDate: "2026-04-30T10:00:00",
			endDate: "2026-04-30T10:30:00",
		});
		expect(r.success).toBe(false);
	});
});

describe("patchEventBodySchema", () => {
	it("accepts partial fields", () => {
		const r = patchEventBodySchema.safeParse({ title: "Updated" });
		expect(r.success).toBe(true);
	});

	it("rejects unknown keys (strict)", () => {
		const r = patchEventBodySchema.safeParse({ title: "x", extraField: 1 });
		expect(r.success).toBe(false);
	});
});
