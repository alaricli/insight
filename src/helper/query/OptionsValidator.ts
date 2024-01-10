import {InsightError} from "../../controller/IInsightFacade";
import {isNonEmptyArray, isObject} from "./QueryValidator";
import {AnyKey, directions} from "../../model/Query";
import KeyValidator from "./KeyValidator";

export default class OptionsValidator {

	private readonly keyValidator: KeyValidator;
	private readonly groupAndApplyKeys: AnyKey[];

	constructor(keyValidator: KeyValidator, groupAndApplyKeys: AnyKey[]) {
		this.keyValidator = keyValidator;
		this.groupAndApplyKeys = groupAndApplyKeys;
	}

	public validateOptions(uOptions: unknown): string {
		let options = uOptions as any;

		if (!isObject(options)) {
			throw new InsightError("OPTIONS must be object");
		}
		if (!("COLUMNS" in options)) {
			if (Object.keys(options).length <= 1 || (Object.keys(options).length === 2 && "ORDER" in options)) {
				throw new InsightError("OPTIONS missing COLUMNS");
			}
		}
		if (Object.keys(options).length > 2 || (Object.keys(options).length === 2 && !("ORDER" in options))) {
			throw new InsightError("invalid keys OPTIONS");
		}

		let id = "";
		if ("COLUMNS" in options) {
			// Validate COLUMNS and obtain id string
			id = this.validateColumns(options.COLUMNS);
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}

		if ("ORDER" in options) {
			this.validateOrder(options.ORDER, options.COLUMNS);
		} else if (Object.keys(options).length > 1) {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}

		return id;
	}

	private validateColumns(uColumns: unknown): string {
		let id = "";
		if (isNonEmptyArray(uColumns)) {
			let columns: any[] = uColumns as any[];

			let transformationsIsPresent = this.groupAndApplyKeys.length > 0;
			if (transformationsIsPresent) {
				for (const key of columns) {
					if (!this.groupAndApplyKeys.includes(key)) {
						throw new InsightError(
							"Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
					}
				}
			} else {
				id = this.keyValidator.validateKeysAndExtractDatasetId(columns, "COLUMNS");
			}

			return id;
		} else {
			throw new InsightError("COLUMNS must be a non-empty array");
		}
	}

	private validateOrder(uOrder: unknown, columns: string[]) {
		let order = uOrder as any;

		if (order === null) {
			throw new InsightError("ORDER cannot be null or undefined");
		}
		if (typeof order === "string") {
			if (!columns.includes(order)) {
				throw new InsightError("ORDER key must be in COLUMNS");
			}
		} else if (isObject(order)) {
			if (!("dir" in order)) {
				throw new InsightError("ORDER missing \"dir\" key");
			}
			if (!directions.includes(order.dir)) {
				throw new InsightError("Invalid ORDER direction");
			}

			if (!("keys" in order)) {
				throw new InsightError("ORDER missing \"keys\" key");
			}
			if (isNonEmptyArray(order.keys)) {
				for (const key of order.keys as any[]) {
					if (!columns.includes(key)) {
						throw new InsightError("All ORDER keys must be in COLUMNS");
					}
				}
			} else {
				throw new InsightError("ORDER keys must be a non-empty Array");
			}

			if (Object.keys(order).length > 2) {
				throw new InsightError("Extra keys in ORDER");
			}
		} else {
			throw new InsightError("Invalid ORDER type");
		}
	}
}
