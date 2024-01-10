import {InsightDatasetKind, InsightError} from "../../controller/IInsightFacade";
import OptionsValidator from "./OptionsValidator";
import {SectionMField, sectionMFields, SectionSField, sectionSFields} from "../../model/Section";
import FilterValidator from "./FilterValidator";
import {AnyKey} from "../../model/Query";
import TransformationsValidator from "./TransformationsValidator";
import {RoomMField, roomMFields, RoomSField, roomSFields} from "../../model/Room";
import KeyValidator from "./KeyValidator";

export default class QueryValidator {

	private readonly idToKind: Map<string, InsightDatasetKind>;

	constructor(datasetIds: Map<string, InsightDatasetKind>) {
		this.idToKind = datasetIds;
	}

	/**
	 * Validate a query by recursively checking its fields against the EBNF syntax.
	 * Return the dataset ID found in the query.
	 *
	 */
	public validateQuery(uQuery: unknown): string {
		let query = uQuery as any;
		this.validateQueryStructure(query);

		let datasetId: string;
		let groupAndApplyKeys: AnyKey[] = [];
		let keyValidator = new KeyValidator(this.idToKind);
		if ("TRANSFORMATIONS" in query) {
			let transformationsValidator = new TransformationsValidator(keyValidator);
			let info = transformationsValidator.validateTransformations(query.TRANSFORMATIONS);
			datasetId = info.datasetId;
			groupAndApplyKeys = info.groupAndApplyKeys;

			let optionsValidator = new OptionsValidator(keyValidator, groupAndApplyKeys);
			optionsValidator.validateOptions(query.OPTIONS);
		} else {
			let optionsValidator = new OptionsValidator(keyValidator, groupAndApplyKeys);
			datasetId = optionsValidator.validateOptions(query.OPTIONS);
		}

		let kind: InsightDatasetKind;
		let maybeKind = this.idToKind.get(datasetId);
		if (maybeKind) {
			kind = maybeKind;
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
		// Allow empty WHERE clause
		if (!(isObject(query.WHERE) && Object.keys(query.WHERE).length === 0)) {
			let filterValidator = new FilterValidator(datasetId, kind);
			filterValidator.validateFilter(query.WHERE, "WHERE");
		}

		if (datasetId !== "") {
			return datasetId;
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
	}

	private validateQueryStructure(query: any) {
		let validQueryKeys = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];

		if (!isObject(query)) {
			throw new InsightError("Query must be object");
		}
		if (!("WHERE" in query)) {
			throw new InsightError("Missing WHERE");
		}
		if (!("OPTIONS" in query)) {
			throw new InsightError("Missing OPTIONS");
		}
		for (const key of Object.keys(query)) {
			if (!validQueryKeys.includes(key)) {
				throw new InsightError("Excess keys in query");
			}
		}
	}
}

// Below helpers are for query validators to use only
// Typescript has no package-private accessibility modifier
export function isObject(value: any): boolean {
	return value !== null && typeof value === "object";
}

export function isNonEmptyArray(uArray: unknown): boolean {
	return Array.isArray(uArray as any) && (uArray as any[]).length > 0;
}

export function isValidField(fieldRef: string, kind: InsightDatasetKind): boolean {
	return isValidSField(fieldRef, kind) || isValidMField(fieldRef, kind);
}

export function isValidMField(fieldRef: string, kind: InsightDatasetKind): boolean {
	if (kind === InsightDatasetKind.Sections) {
		return isSectionMField(fieldRef);
	} else if (kind === InsightDatasetKind.Rooms) {
		return isRoomMField(fieldRef);
	} else {
		return false;
	}
}

export function isValidSField(fieldRef: string, kind: InsightDatasetKind): boolean {
	if (kind === InsightDatasetKind.Sections) {
		return isSectionSField(fieldRef);
	} else if (kind === InsightDatasetKind.Rooms) {
		return isRoomSField(fieldRef);
	} else {
		return false;
	}
}

export function isSectionSField(fieldRef: string): boolean {
	return sectionSFields.includes(fieldRef as SectionSField);
}

export function isSectionMField(fieldRef: string): boolean {
	return sectionMFields.includes(fieldRef as SectionMField);
}

export function isRoomSField(fieldRef: string): boolean {
	return roomSFields.includes(fieldRef as RoomSField);
}

export function isRoomMField(fieldRef: string): boolean {
	return roomMFields.includes(fieldRef as RoomMField);
}
