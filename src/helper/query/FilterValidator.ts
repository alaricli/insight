import {InsightDatasetKind, InsightError} from "../../controller/IInsightFacade";
import {Logic, logics, MComparator, mComparators} from "../../model/Query";
import {isObject, isValidField, isValidMField, isValidSField} from "./QueryValidator";

export default class FilterValidator {

	private readonly datasetId: string;
	private readonly kind: InsightDatasetKind;

	public constructor(id: string, kind: InsightDatasetKind) {
		this.datasetId = id;
		this.kind = kind;
	}

	public validateFilter(uFilter: unknown, filterType: string) {
		let filter = uFilter as any;
		if (!isObject(filter)) {
			throw new InsightError(filterType + " must be object");
		}

		if (Object.keys(filter).length !== 1) {
			throw new InsightError(filterType + " should only have 1 key, has " + Object.keys(filter).length);
		}

		if (Object.keys(filter).length === 1) {
			let filterKey = Object.keys(filter)[0];
			switch (filterKey) {
				case "AND":
				case "OR":
					this.validateLogicComparison(filter);
					break;
				case "LT":
				case "GT":
				case "EQ":
					this.validateMathComparison(filter);
					break;
				case "IS":
					this.validateStringComparison(filter);
					break;
				case "NOT":
					this.validateNegation(filter);
					break;
				default:
					throw new InsightError("Invalid filter key: " + filterKey);
			}
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
	}

	private validateLogicComparison(uLogicComparison: unknown) {
		let logicComparison = uLogicComparison as any;

		if (Object.keys(logicComparison).length !== 1) {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
		if (!logics.includes(Object.keys(logicComparison)[0] as Logic)) {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}

		let logic: Logic = Object.keys(logicComparison)[0] as Logic;
		if (!Array.isArray(logicComparison[logic])) {
			throw new InsightError(logic + " must be a non-empty array");
		}

		let filterList = logicComparison[logic] as unknown[];
		if (filterList.length === 0) {
			throw new InsightError(logic + " must be a non-empty array");
		}

		if (filterList.length > 0) {
			for (const f of filterList) {
				this.validateFilter(f, logic);
			}
		}
	}

	private validateMathComparison(uMathComparison: unknown) {
		let mathComparison = uMathComparison as any;

		if (Object.keys(mathComparison).length !== 1) {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
		if (!mComparators.includes(Object.keys(mathComparison)[0] as MComparator)) {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}

		let comparator = Object.keys(mathComparison)[0] as MComparator;
		let comparison = mathComparison[comparator];
		if (!isObject(comparison)) {
			throw new InsightError(comparator + " must be object");
		}
		if (Object.keys(comparison).length !== 1) {
			throw new InsightError(comparator + " should only have 1 key, has " + Object.keys(comparison).length);
		}

		let key: string = Object.keys(comparison)[0];
		// Throw error if:
		// Key does not contain "_", or field following "_" is not in fields
		let fieldRef = key.substring(key.indexOf("_") + 1);
		if (!key.includes("_") || !isValidField(fieldRef, this.kind)) {
			throw new InsightError("Invalid key " + key + " in " + comparator);
		}
		// Field following "_" is not in mField
		if (!isValidMField(fieldRef, this.kind)) {
			throw new InsightError("Invalid key type in " + comparator);
		}
		// Dataset id preceding "_" is not equal to datasetId
		if (key.substring(0, key.indexOf("_")) !== this.datasetId) {
			throw new InsightError("Cannot query more than one dataset");
		}
		// Value is not a number
		if (typeof comparison[key] !== "number") {
			throw new InsightError("Invalid value type in " + comparator + ", should be number");
		}
	}

	private validateStringComparison(uStringComparison: unknown) {
		let stringComparison = uStringComparison as any;

		if (Object.keys(stringComparison).length !== 1) {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
		if (Object.keys(stringComparison)[0] !== "IS") {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}

		let comparison: any = stringComparison.IS;
		if (!isObject(comparison)) {
			throw new InsightError("IS must be object");
		}
		if (Object.keys(comparison).length !== 1) {
			throw new InsightError("IS should only have 1 key, has " + Object.keys(comparison).length);
		}

		let key: string = Object.keys(comparison)[0];
		// Throw error if:
		// Key does not contain "_", or field following "_" is not in fields
		let fieldRef = key.substring(key.indexOf("_") + 1);
		if (!key.includes("_") || !isValidField(fieldRef, this.kind)) {
			throw new InsightError("Invalid key " + key + " in IS");
		}
		// Field following "_" is not in sField
		if (!isValidSField(fieldRef, this.kind)) {
			throw new InsightError("Invalid key type in IS");
		}
		// Dataset id preceding "_" is not equal to datasetId
		if (key.substring(0, key.indexOf("_")) !== this.datasetId) {
			throw new InsightError("Cannot query more than one dataset");
		}
		let value = comparison[key];
		// Value is not a number
		if (typeof value !== "string") {
			throw new InsightError("Invalid value type in IS, should be string");
		}
		// An asterisk is in the middle of the string
		if (value.length >= 3 && value.substring(1, value.length - 1).includes("*")) {
			throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
		}
	}

	private validateNegation(uNegation: unknown) {
		let negation = uNegation as any;

		if (Object.keys(negation).length !== 1) {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
		if (Object.keys(negation)[0] !== "NOT") {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}

		this.validateFilter(negation.NOT, "NOT");
	}
}
