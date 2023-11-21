import path from "path";
import * as fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import Section from "./Section";
import Dataset from "./Dataset";
import {isObject} from "util";

const validCols: string[] = ["dept", "id", "avg", "instructor", "pass", "fail", "title", "audit", "uuid", "year"];
const validRoomCols: string[] = ["fullname", "shortname", "number",
	"name", "address", "lat", "lon", "seats", "type", "furniture","href"];

export function loadMemory(addedIdArr: string[], addedDatasets: Dataset[]) {
	let emptySections: Section[] = [];
	let emptyBuildings = new Map<string, any[]>();
	let dataFolder = path.join(__dirname, "..", "..", "data");
	if (!fs.existsSync(dataFolder)){
		fs.mkdirSync(dataFolder);
	}
	let filesRead = fs.readdirSync(dataFolder);
	filesRead.forEach((filename) => {
		let content = fs.readFileSync(dataFolder + "/" + filename, "utf8");
		let usefulContent = JSON.parse(content);
		let tmpStr = content.toString();
		let newds: Dataset;
		let filenameWithoutJson = filename.split(".")[0];
		if (usefulContent.length !== 0 && !addedIdArr.includes(filenameWithoutJson)) {
			if (!tmpStr.includes("courses")) {
				let buildings = jsonToMap(content);
				newds = new Dataset(usefulContent.id, usefulContent.kind, usefulContent.length, emptySections,
					buildings);
			} else {
				newds = new Dataset(usefulContent.id, usefulContent.kind, usefulContent.length, usefulContent.sections,
					emptyBuildings);
			}
			addedIdArr.push(filenameWithoutJson);
			addedDatasets.push(newds);
		}
	});
}

export function handleRoomList(roomLists: any[]) {
	let roomQueryList: any[] = [];
	if (roomLists.length !== 0) {
		for (let roomAdded of roomLists) {
			for (let room of roomAdded) {
				if (room.length !== 0) {
					let i = 0;
					while (i < room.length) {
						roomQueryList.push(room[i]);
						i++;
					}
				}
			}
		}
	}
	let finalRes: any[] = [];
	finalRes.push(roomQueryList);
	return finalRes;
}

export function compareColumn (a: any, b: any, sortColumns: any[], dir: number) {
	let i = 0;
	let res = 0;
	while (i < sortColumns.length) {
		let colm = sortColumns[i];
		let newColumn = colm.split("_")[1];
		if (!validCols.includes(newColumn) && !validRoomCols.includes(newColumn)) {
			newColumn = colm;
		}
		if (a[newColumn] === b[newColumn]) {
			i++;
		} else {
			if(a[newColumn] > b[newColumn]) {
				res = -dir;
				break;
			} else {
				res = dir;
				break;
			}
		}
		if (i === sortColumns.length) {
			res = 0;
		}
	}
	return res;
}

function jsonToMap(jsonString: any)  {
	let jsonObject = JSON.parse(jsonString);
	let dataObject = jsonObject["buildings"];
	let dataMap: any = new Map(Object.entries(dataObject));
	return dataMap;
}

export function group(groupList: any[], lastRes: any[]) {
	let map = new Map<string, any[]>();
	let groupRes: any[] = [];
	lastRes.forEach((sec: any) => {
		let keyVal = "";
		groupList.forEach((key: any) => {
			let newKey = key.split("_")[1];
			keyVal = sec[newKey].toString() + keyVal;
		});
		if (!map.has(keyVal)) {
			let groups = [];
			groups.push(sec);
			map.set(keyVal, groups);
		} else {
			map?.get(keyVal)?.push(sec);
		}
	});

	map.forEach((v,k) => {
		groupRes.push(v);
	});
	return groupRes;
}

export function applyHelper(applyquery: any, groupresult: any[], groupList: any[], optionList: any[], datasetID: any){
	checkApply(applyquery, datasetID);
	// let innerKey = Object.keys(applyquery[0]);
	// let applyRuleKey = Object.keys(applyquery[0][innerKey[0]]);
	let applyNameList: any[] = [];
	for (let query of applyquery) {
		let queryKey = Object.keys(query).toString();
		if (applyNameList.indexOf(queryKey) !== -1) {
			throw new InsightError("apply has duplicate keys");
		}
		applyNameList.push(queryKey);
	}
	let allColumns = groupList.concat(applyNameList);
	optionList.forEach((col) => {
		if (!allColumns.includes(col) && !validCols.includes(col) && !validRoomCols.includes(col)) {
			throw new InsightError("invalid columns in option");
		}
	});
	let columnsUsing = [];
	for (let query of applyquery) {
		let queryKey = Object.keys(query)[0];
		columnsUsing.push(queryKey);
	}
	for (let q of applyquery) {
		let singleGroupMathRes: any[] = [];
		groupresult.forEach((g) => {
			let gkey = Object.keys(q)[0]; // overallAVG
			let gNameTmp = q[gkey];
			let qnameKey: any = Object.keys(gNameTmp)[0]; // AVG
			let innerApp = gNameTmp[qnameKey]; // courses_avg
			if (innerApp.split("_")[0] !== datasetID) {
				throw new InsightError("apply with two ds");
			}
			singleGroupMathRes = applyMathHelper(gkey, qnameKey, innerApp, g);
			addNewColumnToSec(g, singleGroupMathRes, gkey);
		});
	}
	let applyResult: any[];
	applyResult = manageNewGroup(groupresult, groupList, columnsUsing);
	return applyResult;
}

function checkApply(applyquery: any, datasetID: any) {
	if (!isObject(applyquery)) {
		throw new InsightError("apply is a object");
	}
	let innerKey = Object.keys(applyquery[0]);
	let applyRuleKey = Object.keys(applyquery[0][innerKey[0]]);
	if (applyRuleKey.length > 1) {
		throw new InsightError("apply has more than 1 key");
	}
	for (let q of applyquery) {
		let gkey = Object.keys(q)[0]; // overallAVG
		if (gkey === "") {
			throw new InsightError("empty apply key");
		}
		let gNameTmp = q[gkey];
		let qnameKey: any = Object.keys(gNameTmp)[0]; // AVG
		let innerApp = gNameTmp[qnameKey]; // courses_avg
		if (innerApp.split("_")[0] !== datasetID) {
			throw new InsightError("apply with two ds");
		}
	}
}

export function manageNewGroup(groupresult: any[], groupList: any[], columnUsing: any[]) {
	let finalRes: any[] = [];
	groupresult.forEach((g) => {
		finalRes.push(g[0]);
	});
	return finalRes;
}

function applyMathHelper(gkey: any, qnameKey: any, innerApp: any, g: any[]) {
	let mathRes: any;
	if (qnameKey === "AVG") {
		let sum = 0;
		for (let sec of g) {
			let newKey = innerApp.split("_")[1];
			sum += sec[newKey];
		}
		mathRes = Number((sum / g.length).toFixed(2));
	} else if (qnameKey === "SUM") {
		let sum = 0;
		for (let sec of g) {
			let newKey = innerApp.split("_")[1];
			sum += sec[newKey];
		}
		mathRes = Number(sum.toFixed(2));
	} else if (qnameKey === "MAX") {
		let tmp: any[] = [];
		for (let sec of g) {
			let newKey = innerApp.split("_")[1];
			tmp.push(sec[newKey]);
		}
		mathRes = Math.max(...tmp);
	} else if (qnameKey === "MIN") {
		let tmp: any[] = [];
		for (let sec of g) {
			let newKey = innerApp.split("_")[1];
			tmp.push(sec[newKey]);
		}
		mathRes = Math.min(...tmp);
	} else if (qnameKey === "COUNT") {
		let newKey = innerApp.split("_")[1];
		let tmpLst: any[] = [];
		for (let sec of g) {
			if (!tmpLst.includes(sec[newKey])) {
				tmpLst.push(sec[newKey]);
			}
		}
		mathRes = tmpLst.length;
	} else {
		throw new InsightError("not valid apply rule");
	}
	return mathRes;
}

function addNewColumnToSec(groupTmp: any, singleGroupMathRes: any, column: any) {
	groupTmp.forEach((sec: any) => {
		sec[column] = singleGroupMathRes;
	});
}

export function hanldeRooms(buildingList: any) {
	let roomlst: any[] = [];
	console.log(buildingList);
	roomlst = Array.from(buildingList.values());
	return roomlst;
}

export function multiOrderHelper(direction: any, sortColumns: any[], lastRes: any[], columnsInOptions: any[]) {
	let tmpRes: any[];
	let dir = 1;
	if (direction === "UP") {
		dir = -1;
	}
	sortColumns.forEach((col) => {
		if (!columnsInOptions.includes(col)) {
			throw new InsightError("sort key not in column");
		}
	});
	tmpRes = lastRes.sort(function compareFn (a, b): number {
		let res = compareColumn(a, b, sortColumns, dir);
		return res;
	});
	return tmpRes;
}
