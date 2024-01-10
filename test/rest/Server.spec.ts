import Server from "../../src/rest/Server";

import {expect} from "chai";
import request, {Request} from "supertest";
import {clearDisk} from "../TestUtil";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import {readFileSync} from "fs";

describe("Facade D3", function () {

	let server: Server;
	const SERVER_URL = "http://localhost:4321";
	const ZIP_FILE_PATH = "test/resources/archives/";
	const PAIR_ZIP_DATA = readFileSync(ZIP_FILE_PATH + "pair.zip");
	const CPSC310_ZIP_DATA = readFileSync(ZIP_FILE_PATH + "cpsc310.zip");
	const CAMPUS_ZIP_DATA = readFileSync(ZIP_FILE_PATH + "campus.zip");
	const BUCHANAN_ZIP_DATA = readFileSync(ZIP_FILE_PATH + "buchanan.zip");

	enum RequestType {
		GET,
		PUT,
		POST,
		DELETE
	}

	function putRequestURL(id: string, kind: InsightDatasetKind): string {
		return "/dataset/" + id + "/" + kind;
	}
	function deleteRequestURL(id: string): string {
		return "/dataset/" + id;
	}
	function postRequestURL(): string {
		return "/query";
	}
	function getRequestURL(): string {
		return "/datasets/";
	}

	before(function () {
		server = new Server(4321);
		// TODO: start server here once and handle errors properly
		server.start().catch((err) => {
			expect.fail((err as Error).message);
		});
	});

	after(function () {
		// TODO: stop server here once!
		server.stop().catch((err) => {
			expect.fail((err as Error).message);
		});
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	describe("PUT addDataSet", function () {

		beforeEach(function () {
			clearDisk();
			server.refreshInsightFacade();
		});

		it("add sections", async function () {
			try {
				let response =
					await sendRequest(
						RequestType.PUT,
						putRequestURL("sections", InsightDatasetKind.Sections),
						PAIR_ZIP_DATA);
				expect(response.status).to.equal(200);
				arraysEqualUnordered(response.body.result, ["sections"]);
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});

		it("add cpsc310", async function () {
			try {
				let response =
					await sendRequest(
						RequestType.PUT,
						putRequestURL("cpsc310", InsightDatasetKind.Sections),
						CPSC310_ZIP_DATA);
				expect(response.status).to.equal(200);
				arraysEqualUnordered(response.body.result, ["cpsc310"]);
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});

		it("add rooms", async function () {
			try {
				let response =
					await sendRequest(
						RequestType.PUT,
						putRequestURL("rooms", InsightDatasetKind.Rooms),
						CAMPUS_ZIP_DATA);
				expect(response.status).to.equal(200);
				arraysEqualUnordered(response.body.result, ["rooms"]);
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});

		it("add buchanan", async function () {
			try {
				let response =
					await sendRequest(
						RequestType.PUT,
						putRequestURL("buchanan", InsightDatasetKind.Rooms),
						BUCHANAN_ZIP_DATA);
				expect(response.status).to.equal(200);
				arraysEqualUnordered(response.body.result, ["buchanan"]);
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});

		it("error response", async function () {
			try {
				let response =
					await sendRequest(
						RequestType.PUT,
						putRequestURL("buchanan_", InsightDatasetKind.Rooms),
						BUCHANAN_ZIP_DATA);
				expect(response.status).to.equal(400);
				expect(response.body.error).to.be.a("string");
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});
	});

	describe("DELETE removeDataSet", function () {
		beforeEach(function () {
			clearDisk();
			server.refreshInsightFacade();
		});

		it("delete cpsc310", async function () {
			try {
				await sendRequest(
					RequestType.PUT,
					putRequestURL("cpsc310", InsightDatasetKind.Sections),
					CPSC310_ZIP_DATA);
				let response =
					await sendRequest(
						RequestType.DELETE,
						deleteRequestURL("cpsc310"));
				expect(response.status).to.equal(200);
				expect(response.body.result).to.equal("cpsc310");
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});

		it("error response", async function () {
			try {
				let response =
					await sendRequest(
						RequestType.DELETE,
						deleteRequestURL("cpsc310"));
				expect(response.status).to.equal(404);
				expect(response.body.error).to.be.a("string");
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});
	});

	describe("POST performQuery", function () {
		beforeEach(function () {
			clearDisk();
			server.refreshInsightFacade();
		});

		it("query data", async function () {
			try {
				await sendRequest(
					RequestType.PUT,
					putRequestURL("buchanan", InsightDatasetKind.Rooms),
					BUCHANAN_ZIP_DATA);
				let query = {
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"buchanan_name"
						]
					}
				};
				let response =
					await sendRequest(
						RequestType.POST,
						postRequestURL(),
						query);
				expect(response.status).to.equal(200);
				arraysEqualUnordered(
					response.body.result,
					[{buchanan_name: "BUCH_A101"}, {buchanan_name: "BUCH_A102"}, {buchanan_name: "BUCH_A103"},
						{buchanan_name: "BUCH_A104"}, {buchanan_name: "BUCH_A201"}, {buchanan_name: "BUCH_A202"},
						{buchanan_name: "BUCH_A203"}, {buchanan_name: "BUCH_B141"}, {buchanan_name: "BUCH_B142"},
						{buchanan_name: "BUCH_B208"}, {buchanan_name: "BUCH_B209"}, {buchanan_name: "BUCH_B210"},
						{buchanan_name: "BUCH_B211"}, {buchanan_name: "BUCH_B213"}, {buchanan_name: "BUCH_B215"},
						{buchanan_name: "BUCH_B216"}, {buchanan_name: "BUCH_B218"}, {buchanan_name: "BUCH_B219"},
						{buchanan_name: "BUCH_B302"}, {buchanan_name: "BUCH_B303"}, {buchanan_name: "BUCH_B304"},
						{buchanan_name: "BUCH_B306"}, {buchanan_name: "BUCH_B307"}, {buchanan_name: "BUCH_B308"},
						{buchanan_name: "BUCH_B309"}, {buchanan_name: "BUCH_B310"}, {buchanan_name: "BUCH_B312"},
						{buchanan_name: "BUCH_B313"}, {buchanan_name: "BUCH_B315"}, {buchanan_name: "BUCH_B316"},
						{buchanan_name: "BUCH_B318"}, {buchanan_name: "BUCH_B319"}, {buchanan_name: "BUCH_D201"},
						{buchanan_name: "BUCH_D204"}, {buchanan_name: "BUCH_D205"}, {buchanan_name: "BUCH_D207"},
						{buchanan_name: "BUCH_D209"}, {buchanan_name: "BUCH_D213"}, {buchanan_name: "BUCH_D214"},
						{buchanan_name: "BUCH_D216"}, {buchanan_name: "BUCH_D217"}, {buchanan_name: "BUCH_D218"},
						{buchanan_name: "BUCH_D219"}, {buchanan_name: "BUCH_D221"}, {buchanan_name: "BUCH_D222"},
						{buchanan_name: "BUCH_D228"}, {buchanan_name: "BUCH_D229"}, {buchanan_name: "BUCH_D301"},
						{buchanan_name: "BUCH_D304"}, {buchanan_name: "BUCH_D306"}, {buchanan_name: "BUCH_D307"},
						{buchanan_name: "BUCH_D312"}, {buchanan_name: "BUCH_D313"}, {buchanan_name: "BUCH_D314"},
						{buchanan_name: "BUCH_D315"}, {buchanan_name: "BUCH_D316"}, {buchanan_name: "BUCH_D317"},
						{buchanan_name: "BUCH_D319"}, {buchanan_name: "BUCH_D322"}, {buchanan_name: "BUCH_D323"},
						{buchanan_name: "BUCH_D325"}]);
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});

		it("error response", async function () {
			try {
				await sendRequest(
					RequestType.PUT,
					putRequestURL("buchanan", InsightDatasetKind.Rooms),
					CPSC310_ZIP_DATA);
				let query = {
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							"rooms_name"
						]
					}
				};
				let response =
					await sendRequest(
						RequestType.POST,
						postRequestURL(),
						query);
				expect(response.status).to.equal(400);
				expect(response.body.error).to.be.a("string");
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});
	});

	describe("GET listDataSets", function () {
		beforeEach(function () {
			clearDisk();
			server.refreshInsightFacade();
		});

		it("list datasets", async function () {
			try {
				await sendRequest(
					RequestType.PUT,
					putRequestURL("cpsc310", InsightDatasetKind.Sections),
					CPSC310_ZIP_DATA);
				await sendRequest(
					RequestType.PUT,
					putRequestURL("buchanan", InsightDatasetKind.Rooms),
					BUCHANAN_ZIP_DATA);
				let response =
					await sendRequest(
						RequestType.GET,
						getRequestURL());
				expect(response.status).to.equal(200);
				let dataSetList = response.body.result;
				expect(dataSetList.length).to.equal(2);
				expect(dataSetList[0].id).to.equal("cpsc310");
				expect(dataSetList[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(dataSetList[0].numRows).to.equal(39);
				expect(dataSetList[1].id).to.equal("buchanan");
				expect(dataSetList[1].kind).to.equal(InsightDatasetKind.Rooms);
				expect(dataSetList[1].numRows).to.equal(61);
			} catch (err) {
				expect.fail((err as Error).message);
			}
		});
	});

	function sendRequest(requestType: RequestType, endpointURL: string, body?: any): Request {
		let requestBuilder = request(SERVER_URL);
		let pendingRequest: Request;
		switch (requestType) {
			case RequestType.PUT:
				pendingRequest = requestBuilder.put(endpointURL);
				pendingRequest.send(body);
				pendingRequest.set("Content-Type", "application/x-zip-compressed");
				break;
			case RequestType.DELETE:
				pendingRequest = requestBuilder.del(endpointURL);
				break;
			case RequestType.POST:
				pendingRequest = requestBuilder.post(endpointURL);
				pendingRequest.send(body);
				pendingRequest.set("Content-Type", "application/json");
				break;
			case RequestType.GET:
				pendingRequest = requestBuilder.get(endpointURL);
				break;
			default:
				throw new Error("Invalid Request");
		}
		return pendingRequest;
	}

	function arraysEqualUnordered(arr1: unknown[], arr2: unknown[]) {
		arraysEqual(arr1.sort(), arr2.sort());
	}

	function arraysEqual(arr1: unknown[], arr2: unknown[]) {
		expect(JSON.stringify(arr1)).to.equal(JSON.stringify(arr2));
	}
});
