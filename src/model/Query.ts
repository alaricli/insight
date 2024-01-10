import {SectionMField, SectionSField} from "./Section";
import {RoomMField, RoomSField} from "./Room";

export type SectionSKey = `${string}_${SectionSField}`;
export type SectionMKey = `${string}_${SectionMField}`;

export type RoomSKey = `${string}_${RoomSField}`;
export type RoomMKey = `${string}_${RoomMField}`;

export type SKey = SectionSKey | RoomSKey;
export type MKey = SectionMKey | RoomMKey;
export type Key = SKey | MKey;

export const logics = ["AND", "OR"] as const;
export type Logic = typeof logics[number];
export const mComparators = ["LT", "GT", "EQ"] as const;
export type MComparator = typeof mComparators[number];

export const applyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"] as const;
export type ApplyToken = typeof applyTokens[number];

// An AnyKey should not contain a "_", but typescript cannot express this constraint
export type ApplyKey = string;
export type AnyKey = Key | ApplyKey;

export const directions = ["UP", "DOWN"] as const;
export type Direction = typeof directions[number];
export type Order = AnyKey | {dir: Direction, keys: AnyKey[]};

/**
 * Query object structured according to the EBNF specified in C2.
 *
 */
export interface Query {
	WHERE: Filter | Record<string, never>;
	OPTIONS: Options;
	TRANSFORMATIONS?: Transformations;
}

export type Filter = LogicComparison | MComparison | SComparison | Negation;

// LogicComparison should have exactly 1 key
export type LogicComparison = {
	[key in Logic]?: Filter[];
}

// MComparison should have exactly 1 key
// MComparator should have exactly 1 key
export type MComparison = {
	[key in MComparator]?: {
		[key: SectionMKey | RoomMKey]: number;
	}
}

// IS should have exactly 1 key
export interface SComparison {
	IS: {
		[key: SectionSKey | RoomSKey]: string;
	}
}

export interface Negation {
	NOT: Filter;
}

export interface Options {
	COLUMNS: AnyKey[];
	ORDER?: Order
}

export interface Transformations {
	GROUP: Key[];
	APPLY: ApplyRule[];
}

// There should be exactly 1 ApplyToken key
export interface ApplyRule {
	[key: ApplyKey]: {
		[key in ApplyToken]?: Key;
	}
}
