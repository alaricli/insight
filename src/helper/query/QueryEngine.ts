import {InsightResult, ResultTooLargeError} from "../../controller/IInsightFacade";
import {
	AnyKey,
	ApplyToken,
	Filter,
	Key,
	LogicComparison,
	MComparison,
	MKey,
	Negation,
	Order,
	Query,
	SComparison,
	SKey,
	Transformations
} from "../../model/Query";
import {Section, SectionMField, SectionSField} from "../../model/Section";
import {Room, RoomMField, RoomSField} from "../../model/Room";
import {isObject} from "./QueryValidator";
import Decimal from "decimal.js";

type SField = SectionSField | RoomSField;
type MField = SectionMField | RoomMField;
type AnyField = SField | MField;

type Groups = Map<string, InsightResult[]>;

export default class QueryEngine {

	private readonly datasetId: string;
	private readonly dataList: Array<Section & Room>;

	constructor(dataList: Array<Section & Room>, datasetId: string) {
		this.datasetId = datasetId;
		this.dataList = dataList;
	}

	public query(query: Query): InsightResult[] {
		const limit = 5000;
		let filteredData =
			Object.keys(query.WHERE).length === 0
				? this.dataList
				: this.dataList.filter((data) => this.filterData(data, query.WHERE as Filter));
		let insightResult = this.mapDataToInsightResult(filteredData);
		if (query.TRANSFORMATIONS !== undefined) {
			insightResult = this.transformResult(insightResult, query.TRANSFORMATIONS);
		}
		if (insightResult.length > limit) {
			throw new ResultTooLargeError("Cannot process more than 5000 entries");
		} else {
			insightResult = this.extractColumns(insightResult, query.OPTIONS.COLUMNS);
			if (query.OPTIONS.ORDER !== undefined) {
				insightResult = this.sortColumns(insightResult, query.OPTIONS.ORDER);
			}
			return insightResult;
		}
	}

	private filterData(data: Section & Room, filter: Filter): boolean {
		let filterKey = Object.keys(filter)[0];
		switch (filterKey) {
			case "AND":
			case "OR":
				return this.logicCompare(data, filter as LogicComparison);
			case "LT":
			case "GT":
			case "EQ":
				return this.mathCompare(data, filter as MComparison);
			case "IS":
				return this.stringCompare(data, filter as SComparison);
			case "NOT":
				return this.negate(data, filter as Negation);
			default:
				// Unreachable; for debugging only
				throw new Error("Unexpected Error");
		}
	}

	private logicCompare(data: Section & Room, logicComparison: LogicComparison): boolean {
		if ("AND" in logicComparison && logicComparison.AND) {
			return logicComparison.AND
				.map((filter) => this.filterData(data, filter))
				.reduce((a, b) => a && b);
		}
		if ("OR" in logicComparison && logicComparison.OR) {
			return logicComparison.OR
				.map((filter) => this.filterData(data, filter))
				.reduce((a, b) => a || b);
		}
		// Unreachable; for debugging only
		throw new Error("Unexpected Error");
	}

	private mathCompare(data: Section & Room, mathComparison: MComparison): boolean {
		let comparisonObject;
		let comparisonFn: (a: number, b: number) => boolean;
		let lt = (a: number, b: number) => a < b;
		let gt = (a: number, b: number) => a > b;
		let eq = (a: number, b: number) => a === b;

		if ("LT" in mathComparison && mathComparison.LT) {
			comparisonObject = mathComparison.LT;
			comparisonFn = lt;
		} else if ("GT" in mathComparison && mathComparison.GT) {
			comparisonObject = mathComparison.GT;
			comparisonFn = gt;
		} else if ("EQ" in mathComparison && mathComparison.EQ) {
			comparisonObject = mathComparison.EQ;
			comparisonFn = eq;
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}

		let key = Object.keys(comparisonObject)[0] as MKey;
		let fieldRef = key.substring(key.indexOf("_") + 1) as MField;
		if (key in comparisonObject) {
			return comparisonFn(data[fieldRef], comparisonObject[key]);
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
	}

	private stringCompare(data: Section & Room, stringComparison: SComparison): boolean {
		let key = Object.keys(stringComparison.IS)[0] as SKey;
		let fieldRef = key.substring(key.indexOf("_") + 1) as SField;
		if (key in stringComparison.IS && stringComparison.IS) {
			let inputString = stringComparison.IS[key];
			if (inputString.includes("*")) {
				// Throw error if an asterisk is in the middle
				// Should be unreachable unless validator failed to catch
				if (inputString.length >= 3 && inputString.substring(1, inputString.length - 1).includes("*")) {
					// Unreachable; for debugging only
					throw new Error("Unexpected Error");
				}

				let stringToCheck = data[fieldRef];
				if (inputString === "*" || inputString === "**") {
					return true;
				} else if (inputString[0] === "*" && inputString[inputString.length - 1] === "*") {
					inputString = inputString.substring(1, inputString.length - 1);
					return stringToCheck.includes(inputString);
				} else if (inputString[0] === "*") {
					inputString = inputString.substring(1);
					return stringToCheck.endsWith(inputString);
				} else if (inputString[inputString.length - 1] === "*") {
					inputString = inputString.substring(0, inputString.length - 1);
					return stringToCheck.startsWith(inputString);
				} else {
					// Unreachable; for debugging only
					throw new Error("Unexpected Error");
				}
			} else {
				// Check if value exactly matches inputString
				return data[fieldRef] === inputString;
			}
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
	}

	private negate(data: Section & Room, negation: Negation): boolean {
		return !this.filterData(data, negation.NOT);
	}

	private mapDataToInsightResult(dataList: Array<Section & Room>): InsightResult[] {
		let insightResult: InsightResult[];
		insightResult = dataList.map((data) => {
			let insight: InsightResult = {};
			for (const key of Object.keys(data) as AnyField[]) {
				insight[this.datasetId + "_" + key] = data[key];
			}
			return insight;
		});
		return insightResult;
	}

	private transformResult(insightResult: InsightResult[], transformations: Transformations): InsightResult[] {
		let transformedResult: InsightResult[] = [];
		let groupedByKeys = this.groupByKeys(insightResult, transformations.GROUP);

		for (let entry of Array.from(groupedByKeys.entries())) {
			let transformedSingleResult = JSON.parse(entry[0]) as InsightResult;
			let group = entry[1];
			for (const applyRule of transformations.APPLY) {
				let applyKey = Object.keys(applyRule)[0];
				let applyToken = Object.keys(applyRule[applyKey])[0] as ApplyToken;
				let key = applyRule[applyKey][applyToken] as Key;

				transformedSingleResult[applyKey] = this.apply(group, applyToken, key);
			}
			transformedResult.push(transformedSingleResult);
		}
		return transformedResult;
	}

	private max = (a: number, b: number) => a > b ? a : b;
	private min = (a: number, b: number) => a < b ? a : b;
	private sum = (a: Decimal, b: number) => a.add(new Decimal(b));

	private apply(insightResult: InsightResult[], applyToken: ApplyToken, key: Key): number {
		let values = insightResult.map((insight) => insight[key]);
		switch (applyToken) {
			case "MIN":
				return (values as number[]).reduce(this.min);
			case "MAX":
				return (values as number[]).reduce(this.max);
			case "AVG": {
				let avg = (values as number[]).reduce(this.sum, new Decimal(0)).toNumber() / values.length;
				return parseFloat(avg.toFixed(2));
			}
			case "COUNT":
				return new Set(values).size;
			case "SUM": {
				let sum = (values as number[]).reduce(this.sum, new Decimal(0)).toNumber();
				return parseFloat(sum.toFixed(2));
			}
			default:
				// Unreachable; for debugging only
				throw new Error("Unexpected Error");
		}
	}

	private sortColumns(insightResult: InsightResult[], order: Order): InsightResult[] {
		if (typeof order === "string") {
			return this.sortByProperty(insightResult, order, true);
		} else if (isObject(order)) {
			return this.groupAndSort(insightResult, order.keys, order.dir === "UP");
		} else {
			// Unreachable; for debugging only
			throw new Error("Unexpected Error");
		}
	}

	private groupAndSort(insightResult: InsightResult[], keys: AnyKey[], ascending: boolean): InsightResult[] {
		if (keys.length === 0) {
			return insightResult;
		}
		let key = keys[0];
		let sorted = this.sortByProperty(insightResult, key, ascending);
		let groupedByKey = this.groupByKeys(sorted, [key]);
		let nextKeys = keys.slice(1);
		let result: InsightResult[] = [];
		if (nextKeys.length === 0) {
			result = Array.from(groupedByKey.values()).reduce((list1, list2) => list1.concat(list2), []);
		} else {
			for (let group of Array.from(groupedByKey.values())) {
				result.push(...this.groupAndSort(group, nextKeys, ascending));
			}
		}
		return result;
	}

	private sortByProperty(
		insightResult: InsightResult[],
		key: AnyKey,
		ascending: boolean): InsightResult[] {
		let sorted = Array.from(insightResult);
		sorted.sort((s1, s2) => {
			let v1 = s1[key];
			let v2 = s2[key];
			if (ascending) {
				return v1 > v2 ? 1 : v1 === v2 ? 0 : -1;
			} else {
				return v1 < v2 ? 1 : v1 === v2 ? 0 : -1;
			}
		});

		return sorted;
	}

	private groupByKeys(insightResult: InsightResult[], keys: AnyKey[]): Groups {
		return insightResult.reduce<Groups>((groups, insight): Groups => {
			let groupKey: InsightResult = {};
			for (const key of keys) {
				groupKey[key] = insight[key];
			}
			let groupString = JSON.stringify(groupKey);
			let maybeGroups = groups.get(groupString);
			if (maybeGroups) {
				maybeGroups.push(insight);
			} else {
				groups.set(groupString, [insight]);
			}
			return groups;
		}, new Map<string, InsightResult[]>());
	}

	private extractColumns(insightResult: InsightResult[], columns: AnyKey[]): InsightResult[] {
		return insightResult.map((insight) => {
			let narrowedInsight: InsightResult = {};
			for (const column of columns) {
				narrowedInsight[column] = insight[column];
			}
			return narrowedInsight;
		});
	}
}
