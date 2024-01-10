import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
import InsightFacade from "../../src/controller/InsightFacade";
import {
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import {beforeEach, describe} from "mocha";
import {clearDisk, getContentFromArchives} from "../resources/archives/TestUtil";
import {folderTest} from "@ubccpsc310/folder-test";

chai.use(chaiAsPromised);

type ErrorType = "InsightError" | "ResultTooLargeError";

describe("InsightFacade", function () {

	describe("addDataSet", function () {

		let insightFacade: InsightFacade;
		let bigData: string;
		let cpsc310Data: string;
		let emptyData: string;
		let invalidData: string;
		let roomData: string;

		before(function () {
			bigData = getContentFromArchives("pair.zip");
			cpsc310Data = getContentFromArchives("cpsc310.zip");
			emptyData = getContentFromArchives("empty.zip");
			invalidData = getContentFromArchives("invalid.zip");
			roomData = getContentFromArchives("campus.zip");
		});

		beforeEach(function () {
			clearDisk();
			insightFacade = new InsightFacade();
		});

		it("should add room data set", async function () {
			const ids = ["roomTest"];

			let addedIds = [];
			let jobs = [];
			try {
				for (const id of ids) {
					jobs.push(insightFacade.addDataset(id, roomData, InsightDatasetKind.Rooms));
				}

				addedIds = await jobs[jobs.length - 1];
				arraysEqualUnordered(addedIds, ids);
			} catch (err) {
				expect.fail("Should not have rejected!\n" + (err as Error).message);
			}
		});

		it("should add data set", async function () {
			const ids =
				["a", "abc", "1", "123", "1#(*^# a-=!@&b2 3",
					" a", "a ", " abc ", "a b", "!", "@", "#",
					"$", "%", "^", "&", "*", "(", ")", "+", "\\",
					"-", "=", "[", "]", "{", "}", ";", "'", ":",
					"\"", "|", ",", ".", "<", ">", "/", "?"];

			let addedIds = [];
			let jobs = [];
			try {
				for (const id of ids) {
					jobs.push(insightFacade.addDataset(id, cpsc310Data, InsightDatasetKind.Sections));
				}
				addedIds = await jobs[jobs.length - 1];
				arraysEqualUnordered(addedIds, ids);
			} catch (err) {
				expect.fail("Should not have rejected!\n" + (err as Error).message);
			}
		});

		it("should reject with an existing dataset id", async function () {
			const ids = ["abc", "aa", "abc"];

			try {
				let jobs = [];
				for (const id of ids) {
					jobs.push(insightFacade.addDataset(id, cpsc310Data, InsightDatasetKind.Sections));
				}
				await Promise.all(jobs);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject (and not add) with an invalid dataset id", async function () {
			const ids =
				["", " ", "  ", "   ", "    ", "     ",
					"_", "__", "___", "____", "_____", "a_",
					"_a", "1_", "_1", "a_1", "1_a", " _",
					"_ ", " _ ", "_ _", "random_string"];

			try {
				let jobs = [];
				for (const id of ids) {
					jobs.push(insightFacade.addDataset(id, cpsc310Data, InsightDatasetKind.Sections));
				}
				await Promise.all(jobs);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		// testing validateAndConvertSection method
		it("should reject dataset with empty section", async function () {
			try {
				await insightFacade.addDataset("a", invalidData, InsightDatasetKind.Sections);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		// testing validateAndConvertSection method
		it("should reject dataset with boolean section data", async function () {
			try {
				await insightFacade.addDataset("a", invalidData, InsightDatasetKind.Sections);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject with empty dataset", async function () {
			try {
				await insightFacade.addDataset("a", emptyData, InsightDatasetKind.Sections);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject with no data", async function () {
			try {
				await insightFacade.addDataset("a", "", InsightDatasetKind.Sections);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject with wrong dataset kind", async function () {
			try {
				await insightFacade.addDataset("a", cpsc310Data, InsightDatasetKind.Rooms);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
			try {
				await insightFacade.addDataset("a", roomData, InsightDatasetKind.Sections);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("removeDataSet", function () {

		let insightFacade: InsightFacade;
		let cpsc310Data: string;
		let roomData: string;

		before(function () {
			cpsc310Data = getContentFromArchives("cpsc310.zip");
			roomData = getContentFromArchives("campus.zip");
		});

		beforeEach(function () {
			clearDisk();
			insightFacade = new InsightFacade();
		});

		it("should remove sections data sets", async function () {
			const ids =
				["a", "abc", "1", "123", "1#(*^# a-=!@&b2 3",
					" a", "a ", " abc ", "a b", "!", "@", "#",
					"$", "%", "^", "&", "*", "(", ")", "+", "\\",
					"-", "=", "[", "]", "{", "}", ";", "'", ":",
					"\"", "|", ",", ".", "<", ">", "/", "?"];

			await insightFacade.addDataset(ids[0], cpsc310Data, InsightDatasetKind.Sections);
			try {
				let removedId = await insightFacade.removeDataset(ids[0]);
				expect(removedId).to.equal(ids[0]);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}

			let jobs = [];
			for (const id of ids) {
				jobs.push(insightFacade.addDataset(id, cpsc310Data, InsightDatasetKind.Sections));
			}
			await Promise.all(jobs);

			try {
				jobs = [];
				for (const id of ids) {
					jobs.push(insightFacade.removeDataset(id));
				}
				let removedIds = await Promise.all(jobs);
				arraysEqualUnordered(ids, removedIds);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}
		});

		it("should remove rooms data sets", async function () {
			const ids =
                ["a", "abc", "1", "123", "1#(*^# a-=!@&b2 3"];

			await insightFacade.addDataset(ids[0], roomData, InsightDatasetKind.Rooms);
			try {
				let removedId = await insightFacade.removeDataset(ids[0]);
				expect(removedId).to.equal(ids[0]);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}

			let jobs = [];
			for (const id of ids) {
				jobs.push(insightFacade.addDataset(id, roomData, InsightDatasetKind.Rooms));
			}
			await Promise.all(jobs);

			try {
				jobs = [];
				for (const id of ids) {
					jobs.push(insightFacade.removeDataset(id));
				}
				let removedIds = await Promise.all(jobs);
				arraysEqualUnordered(ids, removedIds);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}
		});

		it("should reject with a dataset id that is not found", async function () {
			const id = "a";

			try {
				await insightFacade.removeDataset(id);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(NotFoundError);
			}
		});

		it("should reject (and not remove) with invalid dataset id", async function () {
			const ids =
				["", " ", "  ", "   ", "    ", "     ",
					"_", "__", "___", "____", "_____", "a_",
					"_a", "1_", "_1", "a_1", "1_a", " _",
					"_ ", " _ ", "_ _", "random_string"];

			try {
				let jobs = [];
				for (const id of ids) {
					jobs.push(insightFacade.removeDataset(id));
				}
				await Promise.all(jobs);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("query small data", function () {

		let insightFacade: InsightFacade;

		let cpsc310Data: string;
		let buchananData: string;

		before(function () {
			cpsc310Data = getContentFromArchives("cpsc310.zip");
			buchananData = getContentFromArchives("buchanan.zip");
		});

		beforeEach(function () {
			clearDisk();
			insightFacade = new InsightFacade();
		});

		it("should query data without filter", async function () {
			await insightFacade.addDataset("sections", cpsc310Data, InsightDatasetKind.Sections);
			await insightFacade.addDataset("rooms", buchananData, InsightDatasetKind.Rooms);

			let actualCpsc310: InsightResult[];
			let actualBuchanan: InsightResult[];
			try {
				actualCpsc310 = await insightFacade.performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"sections_uuid"
						]
					}
				});
				actualBuchanan = await insightFacade.performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"rooms_name"
						]
					}
				});
			} catch (err) {
				expect.fail("Should not have rejected!\n" + (err as Error).message);
			}

			arraysEqualUnordered(
				actualCpsc310,
				[{sections_uuid: "1293"}, {sections_uuid: "1294"}, {sections_uuid: "1295"},
					{sections_uuid: "3393"}, {sections_uuid: "3394"}, {sections_uuid: "25818"},
					{sections_uuid: "25819"}, {sections_uuid: "39884"}, {sections_uuid: "39885"},
					{sections_uuid: "43202"}, {sections_uuid: "43203"}, {sections_uuid: "46694"},
					{sections_uuid: "46695"}, {sections_uuid: "46696"}, {sections_uuid: "49892"},
					{sections_uuid: "49893"}, {sections_uuid: "49894"}, {sections_uuid: "52004"},
					{sections_uuid: "52005"}, {sections_uuid: "52006"}, {sections_uuid: "61122"},
					{sections_uuid: "61123"}, {sections_uuid: "61124"}, {sections_uuid: "62385"},
					{sections_uuid: "62386"}, {sections_uuid: "62387"}, {sections_uuid: "67312"},
					{sections_uuid: "67313"}, {sections_uuid: "72359"}, {sections_uuid: "72360"},
					{sections_uuid: "72361"}, {sections_uuid: "75605"}, {sections_uuid: "75606"},
					{sections_uuid: "83431"}, {sections_uuid: "83432"}, {sections_uuid: "83433"},
					{sections_uuid: "90539"}, {sections_uuid: "90540"}, {sections_uuid: "90541"}]);
			arraysEqualUnordered(
				actualBuchanan,
				[{rooms_name: "BUCH_A101"}, {rooms_name: "BUCH_A102"}, {rooms_name: "BUCH_A103"},
					{rooms_name: "BUCH_A104"}, {rooms_name: "BUCH_A201"}, {rooms_name: "BUCH_A202"},
					{rooms_name: "BUCH_A203"}, {rooms_name: "BUCH_B141"}, {rooms_name: "BUCH_B142"},
					{rooms_name: "BUCH_B208"}, {rooms_name: "BUCH_B209"}, {rooms_name: "BUCH_B210"},
					{rooms_name: "BUCH_B211"}, {rooms_name: "BUCH_B213"}, {rooms_name: "BUCH_B215"},
					{rooms_name: "BUCH_B216"}, {rooms_name: "BUCH_B218"}, {rooms_name: "BUCH_B219"},
					{rooms_name: "BUCH_B302"}, {rooms_name: "BUCH_B303"}, {rooms_name: "BUCH_B304"},
					{rooms_name: "BUCH_B306"}, {rooms_name: "BUCH_B307"}, {rooms_name: "BUCH_B308"},
					{rooms_name: "BUCH_B309"}, {rooms_name: "BUCH_B310"}, {rooms_name: "BUCH_B312"},
					{rooms_name: "BUCH_B313"}, {rooms_name: "BUCH_B315"}, {rooms_name: "BUCH_B316"},
					{rooms_name: "BUCH_B318"}, {rooms_name: "BUCH_B319"}, {rooms_name: "BUCH_D201"},
					{rooms_name: "BUCH_D204"}, {rooms_name: "BUCH_D205"}, {rooms_name: "BUCH_D207"},
					{rooms_name: "BUCH_D209"}, {rooms_name: "BUCH_D213"}, {rooms_name: "BUCH_D214"},
					{rooms_name: "BUCH_D216"}, {rooms_name: "BUCH_D217"}, {rooms_name: "BUCH_D218"},
					{rooms_name: "BUCH_D219"}, {rooms_name: "BUCH_D221"}, {rooms_name: "BUCH_D222"},
					{rooms_name: "BUCH_D228"}, {rooms_name: "BUCH_D229"}, {rooms_name: "BUCH_D301"},
					{rooms_name: "BUCH_D304"}, {rooms_name: "BUCH_D306"}, {rooms_name: "BUCH_D307"},
					{rooms_name: "BUCH_D312"}, {rooms_name: "BUCH_D313"}, {rooms_name: "BUCH_D314"},
					{rooms_name: "BUCH_D315"}, {rooms_name: "BUCH_D316"}, {rooms_name: "BUCH_D317"},
					{rooms_name: "BUCH_D319"}, {rooms_name: "BUCH_D322"}, {rooms_name: "BUCH_D323"},
					{rooms_name: "BUCH_D325"}]);
		});
	});

	describe("query big data", function () {

		let insightFacade: InsightFacade;

		let bigData: string;

		before(function () {
			bigData = getContentFromArchives("pair.zip");
		});

		beforeEach(function () {
			clearDisk();
			insightFacade = new InsightFacade();
		});

		it("should throw a ResultTooLargeError", async function () {
			await insightFacade.addDataset("sections", bigData, InsightDatasetKind.Sections);

			try {
				await insightFacade.performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"sections_uuid"
						]
					}
				});
				expect.fail("Should have thrown ResultTooLargeError");
			} catch (err) {
				expect(err).to.be.instanceof(ResultTooLargeError);
			}
		});
	});

	describe("performQuery", function () {

		let insightFacade: InsightFacade;
		let allSectionsData: string;
		let allRoomsData: string;

		before(async function () {
			clearDisk();
			insightFacade = new InsightFacade();
			allSectionsData = getContentFromArchives("pair.zip");
			allRoomsData = getContentFromArchives("campus.zip");
			await insightFacade.addDataset("sections", allSectionsData, InsightDatasetKind.Sections);
			await insightFacade.addDataset("rooms", allRoomsData, InsightDatasetKind.Rooms);
		});

		function target(query: unknown): Promise<InsightResult[]> {
			return insightFacade.performQuery(query);
		}

		function assertOnResultUnordered(actual: unknown, expected: InsightResult[]) {
			arraysEqualUnordered(actual as InsightResult[], expected);
		}

		function assertOnResultOrdered(actual: unknown, expected: InsightResult[]) {
			arraysEqual(actual as InsightResult[], expected);
		}

		function assertOnError(actual: any, expected: ErrorType) {
			if (expected === "InsightError") {
				expect(actual).to.be.instanceof(InsightError);
			} else if (expected === "ResultTooLargeError") {
				expect(actual).to.be.instanceof(ResultTooLargeError);
			} else {
				// this should be unreachable
				expect.fail("UNEXPECTED ERROR");
			}
		}

		function errorValidator(error: any): error is ErrorType {
			return error === "InsightError" || error === "ResultTooLargeError";
		}

		folderTest<unknown, InsightResult[], ErrorType>(
			"Test Queries Unordered",
			target,
			"./test/resources/folderTest/unordered",
			{
				assertOnResult: assertOnResultUnordered,
				assertOnError,
				errorValidator
			}
		);

		folderTest<unknown, InsightResult[], ErrorType>(
			"Test Queries Ordered",
			target,
			"./test/resources/folderTest/ordered",
			{
				assertOnResult: assertOnResultOrdered,
				assertOnError,
				errorValidator
			}
		);
	});

	describe("listDataSets", function () {

		let insightFacade: InsightFacade;
		let cpsc310Data: string;
		let cpsc320Data: string;
		let roomData: string;

		before(function () {
			cpsc310Data = getContentFromArchives("cpsc310.zip");
			cpsc320Data = getContentFromArchives("cpsc320.zip");
			roomData = getContentFromArchives("campus.zip");
		});

		beforeEach(function () {
			clearDisk();
			insightFacade = new InsightFacade();
		});

		it("should list zero data set", async function () {

			let dataSetList = await insightFacade.listDatasets();

			try {
				expect(dataSetList.length).to.equal(0);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}
		});

		it("should list one data set", async function () {
			const id = "a";

			await insightFacade.addDataset(id, cpsc310Data, InsightDatasetKind.Sections);
			let dataSetList = await insightFacade.listDatasets();

			try {
				expect(dataSetList.length).to.equal(1);
				expect(dataSetList[0].id).to.equal(id);
				expect(dataSetList[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(dataSetList[0].numRows).to.equal(39);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}
		});

		it("should list multiple data sets", async function () {
			const id1 = "a";
			const id2 = "b";

			await insightFacade.addDataset(id1, cpsc310Data, InsightDatasetKind.Sections);
			await insightFacade.addDataset(id2, cpsc320Data, InsightDatasetKind.Sections);
			let dataSetList = await insightFacade.listDatasets();

			try {
				expect(dataSetList.length).to.equal(2);
				expect(dataSetList[0].id).to.equal(id1);
				expect(dataSetList[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(dataSetList[0].numRows).to.equal(39);
				expect(dataSetList[1].id).to.equal(id2);
				expect(dataSetList[1].kind).to.equal(InsightDatasetKind.Sections);
				expect(dataSetList[1].numRows).to.equal(33);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}
		});

		it("should list multiple data sets containing both sections & rooms", async function () {
			const id1 = "a";
			const id2 = "b";
			const id3 = "c";

			await insightFacade.addDataset(id1, cpsc310Data, InsightDatasetKind.Sections);
			await insightFacade.addDataset(id2, cpsc320Data, InsightDatasetKind.Sections);
			await insightFacade.addDataset(id3, roomData, InsightDatasetKind.Rooms);
			let dataSetList = await insightFacade.listDatasets();

			try {
				expect(dataSetList.length).to.equal(3);
				expect(dataSetList[0].id).to.equal(id1);
				expect(dataSetList[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(dataSetList[0].numRows).to.equal(39);
				expect(dataSetList[1].id).to.equal(id2);
				expect(dataSetList[1].kind).to.equal(InsightDatasetKind.Sections);
				expect(dataSetList[1].numRows).to.equal(33);
				expect(dataSetList[2].id).to.equal(id3);
				expect(dataSetList[2].kind).to.equal(InsightDatasetKind.Rooms);
				expect(dataSetList[2].numRows).to.equal(364);
			} catch (err) {
				expect.fail("Should not have rejected!");
			}
		});
	});

	function arraysEqualUnordered(arr1: unknown[], arr2: unknown[]) {
		arraysEqual(arr1.sort(), arr2.sort());
	}

	function arraysEqual(arr1: unknown[], arr2: unknown[]) {
		expect(JSON.stringify(arr1)).to.equal(JSON.stringify(arr2));
	}
});
