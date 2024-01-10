import {Room} from "../../model/Room";

type Document = any;
type Element = any;
type TextNode = any;
type ChildNode = any;
type Attribute = any;

export enum TableType {
	Buildings,
	Rooms
}

export default class HTMLTreeReader {

	private readonly shortNameTableAttr: string = "views-field views-field-field-building-code";
	private readonly fullNameTableAttr: string = "views-field views-field-title";
	private readonly addressTableAttr: string = "views-field views-field-field-building-address";
	private readonly indexTableColumnAttrs = [
		this.shortNameTableAttr,
		this.fullNameTableAttr,
		this.addressTableAttr
	];

	private readonly roomNumTableAttr: string = "views-field views-field-field-room-number";
	private readonly roomCapTableAttr: string = "views-field views-field-field-room-capacity";
	private readonly roomFurTableAttr: string = "views-field views-field-field-room-furniture";
	private readonly roomTypeTableAttr: string = "views-field views-field-field-room-type";
	private readonly roomsTableColumnAttrs = [
		this.roomNumTableAttr,
		this.roomCapTableAttr,
		this.roomFurTableAttr,
		this.roomTypeTableAttr,
	];

	public getTable(htmlTree: Document, tableType: TableType): Element | null {
		let children = this.getChildElems(htmlTree);
		let tables = children
			.map((child) => this.searchForTables(child, tableType))
			.reduce((list1, list2) => list1.concat(list2), []);
		if (tables.length === 0) {
			return null;
		} else {
			return tables[0];
		}
	}

	private searchForTables(node: Element, tableType: TableType): Element[] {
		if (node.nodeName === "table") {
			if (this.isValidIndexTable(node, tableType)) {
				return [node];
			}
			return [];
		}
		let children: Element[] = this.getChildElems(node);
		return children
			.map((child) => this.searchForTables(child, tableType))
			.reduce((list1, list2) => list1.concat(list2), []);
	}

	private getChildElems(node: Document | Element): Element[] {
		if (!node) {
			return [];
		}
		return (node.childNodes as ChildNode[]).filter((child) => !child.nodeName.startsWith("#"));
	}

	private isValidIndexTable(table: Element, tableType: TableType): boolean {
		let tableElems = this.getChildElems(table);
		try {
			let thead = tableElems.filter((elem) => elem.nodeName === "thead")[0];
			let tr =
				this.getChildElems(thead)
					.filter((elem) => elem.nodeName === "tr")[0];
			let tableAttrs: string[] =
				this.getChildElems(tr)
					.map((th) => th.attrs[0].value);
			if (tableType === TableType.Buildings) {
				for (const attr of this.indexTableColumnAttrs) {
					if (!tableAttrs.includes(attr)) {
						return false;
					}
				}
			} else {
				for (const attr of this.roomsTableColumnAttrs) {
					if (!tableAttrs.includes(attr)) {
						return false;
					}
				}
			}
			return true;
		} catch (err) {
			return false;
		}
	}

	public readTable(table: Element, tableType: TableType): Room[] {
		let tbody =
			this.getChildElems(table)
				.filter((child) => child.nodeName === "tbody")[0];
		return this.getChildElems(tbody)
			.map((tr) => {
				if (tableType === TableType.Buildings) {
					return this.rowToBuilding(tr);
				} else {
					return this.rowToRoom(tr);
				}
			})
			.filter((buildingInfo) => buildingInfo !== null) as Room[];
	}

	private rowToBuilding(tr: Element): Room | null {
		let row = this.getChildElems(tr)
			.filter((td) => this.indexTableColumnAttrs.includes(td.attrs[0].value));
		if (row.length !== 3) {
			return null;
		}
		let rowAttrs: string[] = row.map((td) => td.attrs[0].value);
		for (const attr of this.indexTableColumnAttrs) {
			if (!rowAttrs.includes(attr)) {
				return null;
			}
		}
		let shortName = (row.filter((td) => td.attrs[0].value === this.shortNameTableAttr)[0]
			.childNodes[0] as TextNode)
			.value;
		shortName = this.trimEnds(shortName);
		let fullName = ((row.filter((td) => td.attrs[0].value === this.fullNameTableAttr)[0]
			.childNodes[1] as Element)
			.childNodes[0] as TextNode)
			.value;
		fullName = this.trimEnds(fullName);
		let address = (row.filter((td) => td.attrs[0].value === this.addressTableAttr)[0]
			.childNodes[0] as TextNode)
			.value;
		address = this.trimEnds(address);

		return {fullname: fullName, shortname: shortName, address: address} as Room;
	}

	private rowToRoom(tr: Element): Room | null {
		let row = this.getChildElems(tr)
			.filter((td) => this.roomsTableColumnAttrs.includes(td.attrs[0].value));
		if (row.length !== 4) {
			return null;
		}
		let rowAttrs: string[] = row.map((td) => td.attrs[0].value);
		for (const attr of this.roomsTableColumnAttrs) {
			if (!rowAttrs.includes(attr)) {
				return null;
			}
		}
		let roomNum = ((row.filter((td) => td.attrs[0].value === this.roomNumTableAttr)[0]
			.childNodes[1] as Element)
			.childNodes[0] as TextNode)
			.value;
		roomNum = this.trimEnds(roomNum);
		let capacityStr = (row.filter((td) => td.attrs[0].value === this.roomCapTableAttr)[0]
			.childNodes[0] as TextNode)
			.value;
		let capacity = 0;
		try {
			capacity = parseInt(this.trimEnds(capacityStr), 10);
		} catch (err) {
			return null;
		}
		let furniture = (row.filter((td) => td.attrs[0].value === this.roomFurTableAttr)[0]
			.childNodes[0] as TextNode)
			.value;
		furniture = this.trimEnds(furniture);
		let roomType = (row.filter((td) => td.attrs[0].value === this.roomTypeTableAttr)[0]
			.childNodes[0] as TextNode)
			.value;
		roomType = this.trimEnds(roomType);
		let href = ((row.filter((td) => td.attrs[0].value === this.roomNumTableAttr)[0]
			.childNodes[1] as Element)
			.attrs[0] as Attribute)
			.value;
		href = this.trimEnds(href);
		return {number: roomNum, seats: capacity, type: roomType, furniture: furniture, href: href} as Room;
	}

	private trimEnds(str: string) {
		if (str.startsWith("\n")) {
			str = str.substring(1);
		}
		return str.trim();
	}
}
