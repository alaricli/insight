import {InsightDatasetKind, InsightError} from "../../controller/IInsightFacade";
import {isValidField} from "./QueryValidator";

export default class KeyValidator {

	private readonly idToKind: Map<string, InsightDatasetKind>;

	constructor(idToKind: Map<string, InsightDatasetKind>) {
		this.idToKind = idToKind;
	}

	public validateKeysAndExtractDatasetId(keys: any[], domain: string): string {
		let datasetRefs: string[] = [];
		let fieldRefs: string[] = [];
		for (const key of keys) {
			this.validateKeyString(key, domain);
			datasetRefs.push(key.substring(0, key.indexOf("_")));
			fieldRefs.push(key.substring(key.indexOf("_") + 1));
		}

		let datasetId = this.validateDatasetRefs(datasetRefs);
		let kind = this.getKindById(datasetId);
		this.validateFieldRefs(fieldRefs, kind);

		return datasetId;
	}

	public validateKeyString(key: any, domain: string) {
		if (typeof key !== "string") {
			throw new InsightError("Invalid type of " + domain + " key");
		}
		if (key === "") {
			throw new InsightError("Invalid key in " + domain);
		}
		if (key.indexOf("_") === 0) {
			throw new InsightError("Referenced dataset cannot be empty string");
		}
		if (!/^[^_]+_[^_]+$/.test(key)) {
			throw new InsightError("Invalid key " + key + " in " + domain);
		}
	}

	private validateDatasetRefs(datasetRefs: any[]): string {
		let datasetId = "";
		for (const datasetRef of datasetRefs) {
			if (datasetId === "") {
				if (this.idToKind.has(datasetRef)) {
					datasetId = datasetRef;
				} else {
					throw new InsightError("Referenced dataset \"" + datasetRef + "\" not added yet");
				}
			} else {
				if (datasetRef !== datasetId) {
					throw new InsightError("Cannot query more than one dataset");
				}
			}
		}

		if (datasetId !== "") {
			return datasetId;
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
	}

	private validateFieldRefs(fieldRefs: string[], kind: InsightDatasetKind) {
		for (const fieldRef of fieldRefs) {
			if (!isValidField(fieldRef, kind)) {
				throw new InsightError("Invalid field reference " + fieldRef + " in COLUMNS");
			}
		}
	}

	public getKindById(datasetId: string): InsightDatasetKind {
		let maybeKind = this.idToKind.get(datasetId);
		if (maybeKind) {
			return maybeKind;
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
	}
}
