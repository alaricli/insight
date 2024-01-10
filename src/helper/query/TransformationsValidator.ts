import {AnyKey, ApplyKey, ApplyToken, applyTokens, Key} from "../../model/Query";
import {InsightError} from "../../controller/IInsightFacade";
import {isNonEmptyArray, isObject, isValidField, isValidMField} from "./QueryValidator";
import KeyValidator from "./KeyValidator";

export default class TransformationsValidator {

	private readonly keyValidator: KeyValidator;

	public constructor(keyValidator: KeyValidator) {
		this.keyValidator = keyValidator;
	}

	public validateTransformations(uTransformations: unknown): {datasetId: string, groupAndApplyKeys: AnyKey[]} {
		let transformations = uTransformations as any;
		let datasetId: string;
		let groupKeys: Key[];
		let applyKeys: ApplyKey[];

		if (!isObject(transformations)) {
			throw new InsightError("TRANSFORMATIONS must be object");
		}
		if ("GROUP" in transformations) {
			let info = this.validateGroup(transformations.GROUP);
			datasetId = info.datasetId;
			groupKeys = info.groupKeys;
		} else {
			throw new InsightError("TRANSFORMATIONS missing GROUP");
		}
		if ("APPLY" in transformations) {
			applyKeys = this.validateApply(transformations.APPLY, datasetId);
		} else {
			throw new InsightError("TRANSFORMATIONS missing APPLY");
		}
		if (Object.keys(transformations).length > 2) {
			throw new InsightError("Excess keys in TRANSFORMATIONS");
		}

		let groupAndApplyKeys: AnyKey[] = [];
		groupAndApplyKeys.push(...groupKeys);
		groupAndApplyKeys.push(...applyKeys);
		return {datasetId, groupAndApplyKeys};
	}

	private validateGroup(uGroup: unknown): {datasetId: string, groupKeys: Key[]} {
		let datasetId: string;
		let groupKeys: Key[];
		if (isNonEmptyArray(uGroup)) {
			let groupColumns: any[] = uGroup as any[];

			datasetId = this.keyValidator.validateKeysAndExtractDatasetId(groupColumns, "GROUP");
			groupKeys = groupColumns as Key[];
		} else {
			throw new InsightError("GROUP must be a non-empty array");
		}
		return {datasetId, groupKeys};
	}

	private validateApply(uApply: unknown, datasetId: string): ApplyKey[] {
		let applyKeys: ApplyKey[] = [];
		if (Array.isArray(uApply as any)) {
			let applyRules = uApply as any[];
			for (const applyRule of applyRules) {
				applyKeys.push(this.validateApplyRule(applyRule, datasetId));
			}
		} else {
			throw new InsightError("APPLY must be a non-empty array");
		}
		return applyKeys;
	}

	private validateApplyRule(uApplyRule: unknown, datasetId: string): ApplyKey {
		let applyRule = uApplyRule as any;
		if (!isObject(applyRule)) {
			throw new InsightError("Apply rule must be object");
		}
		if (Object.keys(applyRule).length !== 1) {
			throw new InsightError("Apply rule should only have 1 key, has " + Object.keys(applyRule).length);
		}

		let applyKey = Object.keys(applyRule)[0];
		if (applyKey === "") {
			throw new InsightError("Apply key cannot be empty string");
		}
		if (applyKey.includes("_")) {
			throw new InsightError("Cannot have underscore in applyKey");
		}

		let applyBody = applyRule[applyKey];
		if (!isObject(applyBody)) {
			throw new InsightError("Apply body must be object");
		}
		if (Object.keys(applyRule).length !== 1) {
			throw new InsightError("Apply body should only have 1 key, has " + Object.keys(applyRule).length);
		}

		let applyToken = Object.keys(applyBody)[0];
		if (!applyTokens.includes(applyToken as ApplyToken)) {
			throw new InsightError("Invalid transformation operator");
		}

		let key = applyBody[applyToken];
		this.keyValidator.validateKeyString(key, applyToken);
		let datasetRef = key.substring(0, key.indexOf("_"));
		let fieldRef = key.substring(key.indexOf("_") + 1);
		if (datasetRef !== datasetId) {
			throw new InsightError("Cannot query more than one dataset");
		}
		let kind = this.keyValidator.getKindById(datasetRef);

		if (!isValidField(fieldRef, kind)) {
			throw new InsightError("Invalid key " + key + " in " + applyToken);
		}
		if (applyToken !== "COUNT") {
			if (!isValidMField(fieldRef, kind)) {
				throw new InsightError("Invalid key type in " + applyToken);
			}
		}

		return applyKey as ApplyKey;
	}
}
