import {GeoResponse, Room} from "../../model/Room";
import JSZip from "jszip";
import {InsightError} from "../../controller/IInsightFacade";
import {DefaultTreeAdapterMap, Parser} from "parse5";
import {get} from "http";
import HTMLTreeReader, {TableType} from "./HTMLTreeReader";

export default class RoomDataParser {

	private readonly indexFilePath = "index.htm";
	private readonly buildingFilePath = "campus/discover/buildings-and-classrooms/";
	private readonly getRequestURI: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team262/";

	private htmlTreeReader: HTMLTreeReader;

	constructor() {
		this.htmlTreeReader = new HTMLTreeReader();
	}

	public parse(content: string): Promise<Room[]> {
		return new Promise<Room[]>((resolve, reject) => {
			let roomsZip: JSZip;
			JSZip.loadAsync(content, {base64: true}).then((zip) => {
				roomsZip = zip;
				let indexFile = roomsZip.file(this.indexFilePath);
				if (!indexFile) {
					throw new InsightError("Index file not found");
				}
				return indexFile.async("string");
			}).then((html) => {
				let file = Parser.parse<DefaultTreeAdapterMap>(html);
				let index = this.htmlTreeReader.getTable(file, TableType.Buildings);
				if (!index) {
					resolve([]);
				}
				let buildings = this.htmlTreeReader.readTable(index, TableType.Buildings);

				let geoLocationJobs: Array<Promise<[Room, GeoResponse] | null>> = [];
				for (let building of buildings) {
					geoLocationJobs.push(this.getGeoLocation(building));
				}
				return Promise.all(geoLocationJobs);
			}).then((geoLocationInfoList) => {
				let buildings = this.addGeoLocationToBuildings(geoLocationInfoList);

				let roomRetrievalJobs: Array<Promise<Room[] | null>> = [];
				for (let building of buildings) {
					roomRetrievalJobs.push(this.getRooms(building, roomsZip));
				}
				return Promise.all(roomRetrievalJobs);
			}).then((maybeRooms) => {
				let rooms = this.collectRooms(maybeRooms);
				if (rooms.length === 0) {
					throw new InsightError("Invalid dataset");
				}
				resolve(rooms);
			}).catch((err) => reject(new InsightError((err as Error).message)));
		});
	}

	private getGeoLocation(building: Room): Promise<[Room, GeoResponse] | null> {
		return new Promise((resolve) => {
			let encodedAddress = encodeURIComponent(building.address);
			get(this.getRequestURI + encodedAddress, (res) => {
				res.on("data", (body) => {
					let geoResponse: GeoResponse;
					try {
						geoResponse = JSON.parse(body.toString()) as GeoResponse;
						resolve([building, geoResponse]);
					} catch (err) {
						resolve(null);
					}
				});
			}).on("error", (err) => {
				console.log(err.message);
				resolve(null);
			});
		});
	}

	private addGeoLocationToBuildings(infoList: Array<[Room, GeoResponse] | null>): Room[] {
		let validInfoList = infoList
			.filter((info) => info !== null) as Array<[Room, GeoResponse]>;
		let validBuildings: Room[] = [];
		validInfoList.forEach((info) => {
			let building = info[0];
			let geoResponse = info[1];
			if ("error" in geoResponse) {
				// omit building
			} else {
				building.lat = geoResponse.lat;
				building.lon = geoResponse.lon;
				validBuildings.push(building);
			}
		});
		return validBuildings;
	}

	private getRooms(building: Room, zip: JSZip): Promise<Room[] | null> {
		return new Promise((resolve) => {
			let buildingFile = zip.file(this.buildingFilePath + building.shortname + ".htm");
			if (!buildingFile) {
				resolve(null);
			}
			buildingFile?.async("string")
				.then((html) => {
					let file = Parser.parse<DefaultTreeAdapterMap>(html);
					let roomTable = this.htmlTreeReader.getTable(file, TableType.Rooms);
					if (!roomTable) {
						resolve(null);
					}
					let rooms = this.htmlTreeReader.readTable(roomTable, TableType.Rooms);
					let fullname = building.fullname;
					let shortname = building.shortname;
					let address = building.address;
					let lat = building.lat;
					let lon = building.lon;
					for (let room of rooms) {
						room.fullname = fullname;
						room.shortname = shortname;
						room.name = shortname + "_" + room.number;
						room.address = address;
						room.lat = lat;
						room.lon = lon;
					}
					resolve(rooms);
				});
		});
	}

	private collectRooms(maybeRooms: Array<Room[] | null>): Room[] {
		return (maybeRooms
			.filter((rooms) => rooms !== null) as Room[][])
			.reduce((list1, list2) => list1.concat(list2), []);
	}
}
