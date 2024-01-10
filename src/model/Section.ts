export const sectionSFields = ["dept", "id", "instructor", "title", "uuid"] as const;
export type SectionSField = typeof sectionSFields[number];
export const sectionMFields = ["avg", "pass", "fail", "audit", "year"] as const;
export type SectionMField = typeof sectionMFields[number];

export type SectionString = {
	[key in SectionSField]: string;
}

export type SectionNumber = {
	[key in SectionMField]: number;
}

/**
 * Data model for a course section.
 *
 */
export type Section = SectionString & SectionNumber;
