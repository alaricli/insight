export const roomSFields =
	["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"] as const;
export type RoomSField = typeof roomSFields[number];
export const roomMFields = ["lat", "lon", "seats"] as const;
export type RoomMField = typeof roomMFields[number];

export type RoomString = {
	[key in RoomSField]: string;
}

export type RoomNumber = {
	[key in RoomMField]: number;
}

/**
 * Data model for a course section.
 *
 */
export type Room = RoomString & RoomNumber;

export type GeoResponse = {lat: number, lon: number} | {error: string};
