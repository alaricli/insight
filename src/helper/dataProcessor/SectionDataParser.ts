import {SectionMField, Section, SectionSField} from "../../model/Section";
import JSZip, {JSZipObject} from "jszip";
import {InsightError} from "../../controller/IInsightFacade";

const sFileProps = ["id", "Course", "Title", "Professor", "Subject"] as const;
type SFileProp = typeof sFileProps[number];
const mFileProps = ["Year", "Avg", "Pass", "Fail", "Audit"] as const;
type MFileProp = typeof mFileProps[number];

export default class SectionDataParser {

	// data in section that should be string
	private readonly sectionSFieldMap =
		new Map<SFileProp, SectionSField>([
			["id", "uuid"],
			["Course", "id"],
			["Title", "title"],
			["Professor", "instructor"],
			["Subject", "dept"]
		]);

	// data in section that should be number
	private readonly sectionMFieldMap =
		new Map<MFileProp, SectionMField>([
			["Year", "year"],
			["Avg", "avg"],
			["Pass", "pass"],
			["Fail", "fail"],
			["Audit", "audit"]
		]);

	public parse(content: string): Promise<Section[]> {
		return new Promise<Section[]>((resolve, reject) => {
			// decode base64 string
			JSZip.loadAsync(content, {base64: true}).then((zip) => {
				let jobs: Array<Promise<string>> = [];
				for (const path of Object.keys(zip.files)) {
					if (path.startsWith("courses/") && path !== "courses/" && zip.file(path) !== null) {
						jobs.push((zip.file(path) as JSZipObject).async("string"));
					}
				}
				return Promise.all(jobs);
			}).then((jsons) => {
				let sections = this.processJsonFiles(jsons);
				if (sections.length === 0) {
					throw new InsightError("Invalid dataset");
				}
				resolve(sections);
			}).catch((err) => reject(new InsightError((err as Error).message)));
		});
	}

	private processJsonFiles(jsons: string[]): Section[] {
		return jsons
			.map((json) => {
				return this.fetchSectionsFromSingleFile(json);
			})
			.reduce((sections1, sections2) => sections1.concat(sections2), []);
	}

	private fetchSectionsFromSingleFile(json: string): Section[] {
		let fileContent: any;
		try {
			fileContent = JSON.parse(json);
		} catch (err) {
			throw new InsightError("Invalid JSON file");
		}
		if (fileContent instanceof Object
			&& "result" in fileContent
			&& Array.isArray(fileContent.result)) {
			return (fileContent.result as any[])
				.map((section) => {
					return this.validateAndConvertSection(section);
				})
				.filter((section) => {
					return section !== null;
				}) as Section[];
		} else {
			return [] as Section[];
		}
	}

	private validateAndConvertSection(unprocessedData: unknown): Section | null {
		let sectionData = unprocessedData as any;
		let datasetSection: any = {};

		if (!(sectionData instanceof Object)) {
			return null;
		}

		// validate and convert section for id, course, title, professor, and subject
		for (const key of sFileProps) {
			if (key in sectionData && (typeof sectionData[key] === "string" || typeof sectionData[key] === "number")) {
				datasetSection[this.sectionSFieldMap.get(key) as SectionSField] = sectionData[key] + "";
			} else {
				return null;
			}
		}
		// validate and convert section for year, avg, pass, fail, and audit
		for (const key of mFileProps) {
			if (key in sectionData) {
				if (typeof sectionData[key] === "number") {
					datasetSection[this.sectionMFieldMap.get(key) as SectionMField] = sectionData[key];
				} else if (typeof sectionData[key] === "string" && /^\d+$/.test(sectionData[key])) {
					datasetSection[this.sectionMFieldMap.get(key) as SectionMField] = parseInt(sectionData[key], 10);
				} else {
					return null;
				}
			} else {
				return null;
			}
		}

		if ("Section" in sectionData && sectionData["Section"] === "overall") {
			datasetSection["year"] = 1900;
		}
		return datasetSection as Section;
	}
}
