import http from "http";
import parse5, {Document} from "parse5";
import Room from "./Room";

export function searchNodesWithName(name: string, nodes: parse5.ChildNode[], nodesFound: parse5.ChildNode[]): void {
	for (const node of nodes) {
		if (node.nodeName === name) {
			nodesFound.push(node);
		}
		if ("childNodes" in node) {
			searchNodesWithName(name, node.childNodes, nodesFound);
		}
	}
}

export function getContentInAWithClass(className: string, nodes: parse5.ChildNode[]): string[] {
	let content = [];
	for (const node of nodes) {
		if ("attrs" in node) {
			for (const attr of node.attrs) {
				if (attr.name === "class" && attr.value === className) {
					if ("childNodes" in node) {
						for (const childNode of node.childNodes) {
							if (childNode.nodeName === "a") {
								if ("childNodes" in childNode) {
									for (const grandchildNode of childNode.childNodes) {
										if ("value" in grandchildNode) {
											// .trim() removes spaces and new lines in a string
											content.push(grandchildNode.value.trim());
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	return content;
}

export function getContentInTDWithClass(className: string, nodes: parse5.ChildNode[]): string[] {
	let content = [];
	for (const node of nodes) {
		if ("attrs" in node) {
			for (const attr of node.attrs) {
				if (attr.name === "class" && attr.value === className) {
					if ("childNodes" in node) {
						for (const childNode of node.childNodes) {
							if ("value" in childNode) {
								content.push(childNode.value.trim());
							}
						}
					}
				}
			}
		}
	}
	return content;
}

export async function getBuildingGeoLocation(address: string): Promise<string> {
	return new Promise((resolve, reject) => {
		let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team578/";
		url = url + address.replace(" ", "%20");
		http.get(url, (res: any) => {
			let rawData = "";
			res.on("data", (chunk: string) => rawData += chunk);
			res.on("end", () => resolve(rawData));
		}).on("error", reject);
	});
}

export function getRooms(doc: Document, title: string, code: string, addr: string, lat: number, lon: number): any[] {
	let nodesTd: parse5.ChildNode[] = [];
	searchNodesWithName("td", doc.childNodes, nodesTd);
	let num = getContentInAWithClass("views-field views-field-field-room-number", nodesTd);
	let seats = getContentInTDWithClass("views-field views-field-field-room-capacity", nodesTd);
	let type = getContentInTDWithClass("views-field views-field-field-room-type", nodesTd);
	let furniture = getContentInTDWithClass("views-field views-field-field-room-furniture", nodesTd);
	let href = "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/";

	let roomsArr = [];
	for (const i in num) {
		let room: Room = new Room(
			title,
			code,
			num[i],
			code + "_" + num[i],
			addr,
			lat,
			lon,
			Number(seats[i]),
			type[i],
			furniture[i],
			href + code + "-" + num[i]);
		roomsArr.push(room);
	}
	return roomsArr;
}

export function countNumberOfRooms(buildingsMap: Map<string, any[]>): number {
	let roomsArrs = buildingsMap.values();
	let numRooms = 0;
	for (const roomsArr of roomsArrs) {
		numRooms = numRooms + roomsArr.length;
	}
	return numRooms;
}
