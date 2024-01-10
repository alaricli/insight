import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import fs from "fs";
import QueryValidator from "../helper/query/QueryValidator";
import {Section} from "../model/Section";
import SectionDataParser from "../helper/dataProcessor/SectionDataParser";
import QueryEngine from "../helper/query/QueryEngine";
import {Query} from "../model/Query";
import {Room} from "../model/Room";
import RoomDataParser from "../helper/dataProcessor/RoomDataParser";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {

	private insightData = new Map<string, {kind: InsightDatasetKind, data: Section[] | Room[]}>();

	private idToFileNameMap = new Map<string, number>();

	private readonly persistDir = "./data/";
	private readonly idMapFileName = "idToFileNameMap.json";

	// arrays to hold data being added/removed
	private addJobs: string[] = [];
	private removeJobs: string[] = [];

	// Cannot save files as certain valid IDs
	// A counter that keeps track of the next file id number
	// Each file is named after this number, and the number increments whenever a new file is saved
	private static nextFileId: number = 0;

	constructor() {
		console.log("InsightFacadeImpl::init()");
		let idMapPath = this.persistDir + this.idMapFileName;
		if (fs.existsSync(idMapPath)) {
			let idMap: Array<[string, number]> = JSON.parse(fs.readFileSync(idMapPath, "utf-8"));
			let largestFileId: number = -1;
			for (const entry of idMap) {
				let datasetId = entry[0];
				let fileId = entry[1];

				// Restore id map
				this.idToFileNameMap.set(datasetId, fileId);

				// Restore sections data
				let filePath = this.persistDir + fileId + ".json";
				if (fs.existsSync(filePath)) {
					let data: {kind: InsightDatasetKind, data: Section[]} =
						JSON.parse(fs.readFileSync(filePath, "utf-8"));
					this.insightData.set(datasetId, data);
				} else {
					// Unreachable; for debugging only
					throw new InsightError("Unexpected Error");
				}

				if (fileId > largestFileId) {
					largestFileId = fileId;
				}
			}
			// Start incrementing from the largest id found
			InsightFacade.nextFileId = largestFileId + 1;
		} else {
			// Set next file id to 0 if no data on disk
			InsightFacade.nextFileId = 0;
		}
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise((resolve, reject) => {
			if (!this.addJobs.includes(id)) {
				this.addJobs.push(id);
			} else {
				reject(new InsightError("A dataset " + id + " is already being added"));
			}
			// validate ID
			if (!this.validateID(id)) {
				this.finishAddJob(id);
				reject(new InsightError("Invalid ID."));
			}
			// validate content, cannot be empty
			if (content === "") {
				this.finishAddJob(id);
				reject(new InsightError("Content is empty"));
			}
			// reject ID if it already exists
			if (fs.existsSync(this.persistDir + this.idToFileNameMap.get(id)) || this.insightData.has(id)) {
				this.finishAddJob(id);
				reject(new InsightError("Dataset already exists"));
			}

			let parseJob: Promise<Section[]> | Promise<Room[]>;
			if (kind === InsightDatasetKind.Sections) {
				let sectionDataParser = new SectionDataParser();
				parseJob = sectionDataParser.parse(content);
			} else {
				let roomDataParser = new RoomDataParser();
				parseJob = roomDataParser.parse(content);
			}
			parseJob.then((dataset) => {
				let dataToSave = {kind: kind, data: dataset};
				this.insightData.set(id, dataToSave);

				// Persist data to disk; save JSON file name as the next number id
				this.idToFileNameMap.set(id, InsightFacade.nextFileId);
				let fileName = InsightFacade.nextFileId + ".json";
				fs.mkdirSync(this.persistDir, {recursive: true});
				fs.writeFileSync(this.persistDir + fileName, JSON.stringify(dataToSave));

				// Increment next file id to avoid duplicates
				InsightFacade.nextFileId++;
				this.saveIdMap();
				this.finishAddJob(id);
				resolve(Array.from(this.insightData.keys()));
			}).catch((err) => {
				this.finishAddJob(id);
				reject(err);
			});
		});
	}

	private finishAddJob(id: string) {
		let index = this.addJobs.indexOf(id);
		if (index > -1) {
			this.addJobs.splice(index, 1);
		}
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise((resolve, reject) => {
			if (!this.removeJobs.includes(id)) {
				this.removeJobs.push(id);
			} else {
				reject(new InsightError("A dataset " + id + " is already being removed"));
			}

			// Validate the id.
			if (!this.validateID(id)) {
				this.finishRemoveJob(id);
				reject(new InsightError("Invalid ID."));
			}

			// Delete the dataset file.
			try {
				if (!this.idToFileNameMap.has(id)) {
					this.finishRemoveJob(id);
					reject(new NotFoundError("Dataset " + id + " does not exist"));
				}
				const fileName = this.idToFileNameMap.get(id) + ".json";
				if (!this.insightData.has(id) || !fs.existsSync(this.persistDir + fileName)) {
					this.finishRemoveJob(id);
					reject(new NotFoundError("Dataset " + id + " does not exist"));
				} else {
					// Remove data from memory
					this.insightData.delete(id);
					// Remove data from disk
					fs.rmSync(this.persistDir + fileName);
					this.idToFileNameMap.delete(id);
					this.saveIdMap();

					this.finishRemoveJob(id);
					resolve(id);
				}
			} catch (err) {
				this.finishRemoveJob(id);
				reject(err);
			}
		});
	}

	private finishRemoveJob(id: string) {
		let index = this.removeJobs.indexOf(id);
		if (index > -1) {
			this.removeJobs.splice(index, 1);
		}
	}

	private saveIdMap() {
		let idMapToPersist = JSON.stringify(Array.from(this.idToFileNameMap.entries()));
		fs.writeFileSync(this.persistDir + this.idMapFileName, idMapToPersist);
	}

	private validateID(id: string): boolean {
		return !(/_/.test(id) || id.match(/^\s+$/) || id === "");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise<InsightResult[]>((resolve, reject) => {
			let idToKind = new Map(
				Array.from(this.insightData.entries())
					.map((entry) => [entry[0], entry[1].kind]));
			let queryValidator =
				new QueryValidator(idToKind);

			let datasetId: string = "";
			try {
				datasetId = queryValidator.validateQuery(query);
			} catch (err) {
				reject(err);
			}

			let result: InsightResult[] = [];

			let sections = this.insightData.get(datasetId);
			if (sections !== undefined) {
				let queryEngine = new QueryEngine(sections.data as Array<Section & Room>, datasetId);
				result = queryEngine.query(query as Query);
			} else {
				// Unreachable; for debugging only
				reject(new Error("Unexpected Error"));
			}
			resolve(result);
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(
			Array.from(this.insightData.entries())
				.map((entry): InsightDataset => {
					return {id: entry[0], kind: entry[1].kind, numRows: entry[1].data.length};
				}));
	}
}
