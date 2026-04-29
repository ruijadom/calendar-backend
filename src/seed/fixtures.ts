import type { EventColor } from "../db/schema";

/**
 * Same UUIDs / names as `src/app/modules/appointments/data/clinic-data.ts` (ALL_USERS),
 * so the Communicator maps `providerId` → avatar/name when loading from the API.
 */
export const SEED_PROVIDERS = [
	{
		id: "f3b035ac-49f7-4e92-a715-35680bf63175",
		name: "Dr. Sarah Mitchell",
	},
	{
		id: "dd503cf9-6c38-43cf-94cc-0d4032e2f77a",
		name: "Dr. David Chen",
	},
	{
		id: "3e36ea6e-78f3-40dd-ab8c-a6c737c3c422",
		name: "Dr. James Carter",
	},
	{
		id: "a7aff6bd-a50a-4d6a-ab57-76f76bb27cf5",
		name: "Dr. Elena Rodriguez",
	},
] as const;

export const SEED_CLINICS = [
	{ id: "clinic-central", name: "MedGroup Central Clinic" },
	{ id: "clinic-riverside", name: "MedGroup Riverside Clinic" },
	{ id: "clinic-westside", name: "MedGroup Westside Clinic" },
	{ id: "clinic-downtown", name: "MedGroup Downtown Clinic" },
] as const;

export const SEED_TAG = "communicator-dev" as const;

const COLORS: EventColor[] = [
	"blue",
	"green",
	"red",
	"yellow",
	"purple",
	"orange",
];

const addDays = (d: Date, days: number): Date => {
	const x = new Date(d);
	x.setDate(x.getDate() + days);
	return x;
};

const atHours = (d: Date, h: number, m: number): Date => {
	const x = new Date(d);
	x.setHours(h, m, 0, 0);
	return x;
};

const addMinutes = (d: Date, mins: number): Date =>
	new Date(d.getTime() + mins * 60_000);

export type SeedEventInsert = {
	title: string;
	description: string;
	startAt: Date;
	endAt: Date;
	color: EventColor;
	providerId: string;
	providerName: string;
	clinicId: string;
	clinicName: string;
	isVideoConsultation: boolean;
	videoLink: string | null;
	metadata: Record<string, unknown>;
};

/** ~3 weeks of sample slots inside the default frontend query window (−2mo … +6mo). */
export const buildSeedRows = (now: Date = new Date()): SeedEventInsert[] => {
	const rows: SeedEventInsert[] = [];
	const patients = [
		"Emma Thompson",
		"Liam Johnson",
		"Olivia Martinez",
		"Noah Williams",
		"Ava Brown",
		"Ethan Davis",
		"Sophia Garcia",
	];

	let idx = 0;
	const push = (
		dayOffset: number,
		startH: number,
		startM: number,
		durationMin: number,
		color: EventColor,
		providerIndex: number,
		clinicIndex: number,
		title: string,
		video: boolean,
	): void => {
		const day = addDays(now, dayOffset);
		const startAt = atHours(day, startH, startM);
		const endAt = addMinutes(startAt, durationMin);
		const p = SEED_PROVIDERS[providerIndex % SEED_PROVIDERS.length];
		const c = SEED_CLINICS[clinicIndex % SEED_CLINICS.length];
		rows.push({
			title,
			description: `Seed appointment (${color}). Follow-up as needed.`,
			startAt,
			endAt,
			color,
			providerId: p.id,
			providerName: p.name,
			clinicId: c.id,
			clinicName: c.name,
			isVideoConsultation: video,
			videoLink: video
				? `https://meet.medgroup.com/consultation/seed-${idx}`
				: null,
			metadata: { seedTag: SEED_TAG, seedIndex: idx },
		});
		idx += 1;
	};

	// Past week
	push(-5, 9, 0, 30, "blue", 0, 0, patients[0], false);
	push(-4, 10, 30, 45, "green", 3, 1, patients[1], false);
	push(-3, 14, 0, 60, "red", 2, 3, patients[2], true);
	push(-2, 11, 0, 30, "yellow", 0, 0, patients[3], false);
	push(-1, 15, 30, 30, "purple", 2, 1, patients[4], false);

	// This week
	push(0, 9, 30, 45, "blue", 1, 0, patients[5], false);
	push(0, 13, 0, 30, "orange", 1, 2, patients[6], false);
	push(1, 10, 0, 60, "green", 3, 1, patients[0], true);
	push(2, 8, 0, 30, "red", 2, 3, patients[1], false);
	push(3, 16, 0, 45, "purple", 2, 1, patients[2], false);
	push(4, 12, 0, 30, "blue", 0, 0, patients[3], false);

	// Next weeks
	push(7, 9, 0, 30, COLORS[rows.length % COLORS.length], rows.length % 4, 2, patients[4], false);
	push(10, 14, 30, 45, COLORS[rows.length % COLORS.length], 1, 3, patients[5], true);
	push(14, 11, 0, 60, COLORS[rows.length % COLORS.length], 3, 1, patients[6], false);
	push(21, 10, 30, 30, COLORS[rows.length % COLORS.length], 0, 0, patients[0], false);
	push(28, 15, 0, 45, COLORS[rows.length % COLORS.length], 2, 2, patients[1], false);
	push(35, 9, 30, 30, COLORS[rows.length % COLORS.length], 1, 3, patients[2], false);
	push(42, 13, 0, 60, COLORS[rows.length % COLORS.length], 3, 1, patients[3], true);
	push(45, 10, 0, 45, "blue", 0, 0, patients[4], false);
	push(50, 14, 30, 30, "red", 2, 3, patients[5], false);
	push(55, 11, 30, 60, "green", 3, 1, patients[6], true);
	push(60, 9, 0, 30, "orange", 1, 2, patients[0], false);

	return rows;
};
