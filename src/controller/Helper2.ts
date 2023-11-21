import {InsightError} from "./IInsightFacade";

const validCols: string[] = ["dept", "id", "avg", "instructor", "pass", "fail", "title", "audit", "uuid", "year"];
const validRoomCols: string[] = ["fullname", "shortname", "number",
	"name", "address", "lat", "lon", "seats", "type", "furniture","href"];

export function checkType(rootKey: string, innerKey: string, where: any): string {
	let tmp = where[rootKey][innerKey];
	if (tmp === "*" || tmp === "**") {
		return typeof tmp;
	}
	if (typeof tmp === "string" && tmp.includes("*")) {
		let tmp2 = tmp.substring(1, tmp.length - 1);
		if (tmp2.includes("*")) {
			throw new InsightError("* should only be at the start of the array");
		}
	}
	return typeof tmp;
}

export function idCheckHelper(k: any, idInAll: any[]) {
	if (k.indexOf("_") !== -1) {
		let id = k.split("_")[0];
		let name = k.split("_")[1];
		if (!idInAll.includes(id) && (validRoomCols.includes(name) || validCols.includes(name)) &&
			(typeof Number(id) !== "number")) {
			idInAll.push(id);
		}
	}
}

export function pushAllHelper (source: any, res: any[]) {
	source.forEach((sourceData: any) => {
		sourceData.forEach((sec: any) => {
			res.push(sec);
		});
	});
}

export function handleRooms2(buildingList: any) {
	let tempKeys = Object.keys(buildingList);
	let tempList: any[] = [];
	let midList: any[] = [];
	let finalList: any[] = [];
	tempKeys.forEach((key: string) => {
		tempList.push(buildingList[key]);
	});
	tempList.forEach((roomList: any[]) => {
		roomList.forEach((room: any) => {
			midList.push(room);
		});
	});
	finalList.push(midList);
	return finalList;
}
