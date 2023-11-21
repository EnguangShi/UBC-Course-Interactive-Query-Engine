// import { ByteLengthQueuingStrategy } from "stream/web"
// import { FileWatcherEventKind, getParsedCommandLineOfConfigFile, idText } from "typescript"

import {InsightError}  from "./IInsightFacade";
import {isObject} from "util";
import {checkType, idCheckHelper} from "./Helper2";

const allApplyRules: string[] = ["MAX", "AVG", "SUM", "COUNT", "MIN"];
const validCols: string[] = ["dept", "id", "avg", "instructor", "pass", "fail", "title", "audit", "uuid", "year"];
const validRoomCols: string[] = ["fullname", "shortname", "number",
	"name", "address", "lat", "lon", "seats", "type", "furniture","href"];
const stringCols: string[] = ["dept", "id", "instructor", "title", "uuid",
	"fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];

// check if query is valid
const validString: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname",
	"shortname", "number", "name", "address", "type", "furniture", "href"];
const validNum = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
const numberStr = ["0", "1", "2", "3", "4", "5", "6"];
let idInAll: any[] = [];

export default class Query {
	public query: any;
	public datasetId: string;
	constructor(query: any, datasetId: string) {
		this.query = query;
		this.datasetId = datasetId;
	}

	public checkQuery(): boolean {
		// let keys = Object.keys(this.query);
		let length = Object.keys(this.query).length;
		const where = (this.query)["WHERE"];
		const whereLength = Object.keys(where).length;
		if (whereLength > 1) {
			throw new InsightError("incorrect where length");
		}
		if (whereLength === 1 && !checkWhere(where, this.datasetId)) {
			throw new InsightError("not valid where");
		}
		const options = (this.query)["OPTIONS"];
		const transformations = (this.query)["TRANSFORMATIONS"];
		if (length === 3 && !transformations) {
			checkTransformations(transformations, options, this.datasetId);
		}
		if (!transformations && !checkOptions(options)) {
			throw new InsightError("not valid option");
		}
		checkAllIdFromQuery(where, options, transformations);
		return true;
	}
}

function checkAllIdFromQuery(where: any, options: any, trans: any) {
	let rootKey = Object.keys(where)[0]; // AND IS
	if (isObject(where[rootKey])) {
		let innerKey = where[rootKey][0]; // { IS: { courses_dept: '*ma*' } }
		if (["LT", "EQ", "GT", "IS", "NOT"].includes (rootKey)) {
			if (innerKey === null) {
				throw new InsightError("null query where");
			}
			if (innerKey !== undefined) {
				idWhereHelper(innerKey);
			}
		} else if (["AND", "OR"].includes(rootKey)) {
			where[rootKey].forEach((key: string) => {
				idWhereHelper(key);
			});
		}
		let opRootKey = Object.keys(options)[0]; // COLUMNS
		let idOpList = options[opRootKey];
		idOpList.forEach((idWithName: any) => {
			if (idWithName === null) {
				throw new InsightError("null key option");
			} else {
				if (idWithName.indexOf("_") !== -1) {
					let id = idWithName.split("_")[0];
					let name = idWithName.split("_")[1];
					if (!idInAll.includes(id) && (validRoomCols.includes(name) || validCols.includes(name)) &&
						(typeof Number(id) !== "number")) {
						idInAll.push(id);
					}
				}
			}
		});
		if (trans !== null && trans !== undefined) {
			let group = Object.keys(trans)[0];
			let apply = Object.keys(trans)[1];
			idTransHelper(trans, group, apply);
		}
	}
	if (idInAll.length > 1) {
		console.log(idInAll);
		idInAll = [];
		throw new InsightError("more than 1 dataset");
	}
}

function idTransHelper (trans: any, group: any, apply: any) {
	let groupKeyList = trans[group];
	let applyQueryList = trans[apply];
	groupKeyList.forEach((k: any) => {
		idCheckHelper(k, idInAll);
	});
	applyQueryList.forEach((q: any) => {
		let applyName = Object.keys(q)[0];
		let innerApply = q[applyName];
		let idRule = Object.keys(innerApply)[0];
		let idWithName = innerApply[idRule];
		if (idWithName.indexOf("_") !== -1) {
			let id = idWithName.split("_")[0];
			let name = idWithName.split("_")[1];
			if (!idInAll.includes(id) && (validRoomCols.includes(name) || validCols.includes(name)) &&
				(typeof Number(id) !== "number")) {
				idInAll.push(id);
			}
		}
	});
}

function idWhereHelper(innerKey: any) {
	let subKey = Object.keys(innerKey)[0];
	let idList = Object.keys(innerKey[subKey]);
	let idWithName = idList[0]; // courses_dept
	if (idWithName === null) {
		throw new InsightError("null val in where");
	}
	let id = idList[0].split("_")[0]; // course
	if (!idInAll.includes(id) &&
		(typeof Number(id) !== "number")) {
		idInAll.push(id);
	}
}

function checkWhere(where: any, datasetId: string): boolean {
	if (where === null) {
		throw new InsightError("empty where");
	}
	console.log(Object.keys(where));
	let rootKey = Object.keys(where)[0]; // list of key
	if (where[rootKey] === null) {
		throw new InsightError("not valid query");
	}
	let innerKey = Object.keys(where[rootKey])[0];
	let subKey = Object.keys(where[rootKey]);
	if (["LT", "EQ", "GT", "IS"].includes (rootKey)) {
		if (innerKey.split("_").length > 2) {
			throw new InsightError("underscore error");
		}
		if (innerKey.split("_")[0] !== datasetId) {
			throw new InsightError("unmatched dataset");
		}
		if (rootKey === "IS") {
			if (!validString.includes(innerKey.split("_")[1])) {
				throw new InsightError("some key should be string");
			}
			if (checkType(rootKey, innerKey, where) !== "string") {
				throw new InsightError("not string");
			}
		} else {
			if (!validNum.includes(innerKey.split("_")[1])) {
				throw new InsightError("some key should be number");
			}
			if (checkType(rootKey, innerKey, where) !== "number") {
				throw new InsightError("not number");
			}
		}
	} else if (["AND", "OR"].includes(rootKey)) {
		if (!Array.isArray(where[rootKey]) || where[rootKey].length === 0) {
			throw new InsightError("not valid array");
		}
		where[rootKey].forEach((key: string) => {
			checkWhere(key, datasetId);
		});
	} else if (rootKey === "NOT") {
		if (subKey.length === 0 || subKey.length > 1) {
			throw new InsightError("NOT query with invalid length");
		}
	} else {
		throw new InsightError("NOT valid where key");
	}
	return true;
}


function checkTransformations(transformations: any, options: any, datasetId: string): boolean {
	let transformKeys = Object.keys(transformations);
	transformKeys.forEach((key: string) => {
		if ( (transformKeys.length !== 2) || !["GROUP", "APPLY"].includes(key)) {
			throw new InsightError("no group or apply");
		}
	});
	let group = transformations.GROUP;
	let apply = transformations.APPLY;
	if (!Array.isArray(group) || group.length === 0 || !Array.isArray(apply)) {
		throw new InsightError("group or apply is not array, or empty group");
	}
	for (let subGroup of group) {
		let parseSub = subGroup.split("_");
		if (parseSub.length > 2 || parseSub[0] !== datasetId) {
			throw new InsightError("invalid group");
		}
		if (!validCols.includes(parseSub[1]) && !validRoomCols.includes(parseSub[1])) {
			throw new InsightError("invalid group");
		}

	}
	checkApply(apply);

	return true;
}

function checkApply(apply: any[]): boolean {
	for (let subApply of apply) {
		let applySubKeys = Object.keys(subApply);
		if (applySubKeys.length !== 1) {
			throw new InsightError("invalid apply length");
		}
		let applyRuleKey = applySubKeys[0];
		if (applyRuleKey.includes("_")) {
			throw new InsightError("invalid apply rule format");
		}
		if (Object.keys(applyRuleKey).length !== 1) {
			throw new InsightError("invalid apply rule length");
		}
		if (!allApplyRules.includes(applyRuleKey)) {
			throw new InsightError("invalid apply rule");
		}

		if (Object.keys(applyRuleKey)[0] !== "COUNT" &&
			stringCols.includes(subApply[applyRuleKey][Object.keys(subApply[applyRuleKey])[0]].split("_")[2])) {
			throw new InsightError("invalid apply");
		}


	}
	return true;
}

function checkOptions(options: any): boolean {
	let currOpKeys = Object.keys(options);
	currOpKeys.forEach((currKey: string) => {
		if (currKey !== "COLUMNS" && currKey !== "ORDER") {
			throw new InsightError("not valid op keys");
		}
	});
	let optionOrder = options["ORDER"];
	let optionColumn = options["COLUMNS"];
	optionColumn.forEach((column: string) => {
		let tmpColumn = column.split("_")[1];
		if (!validRoomCols.includes(tmpColumn) && !validCols.includes(tmpColumn)) {
			throw new InsightError("invalid column");
		}
	});
	if (optionOrder === null) {
		throw new InsightError("invalid order");
	}
	if (optionOrder !== undefined) {
		if (typeof optionOrder !== "string") {
			if (Object.keys(optionOrder).length !== 2) {
				throw new InsightError("if ORDER is object, length should be 2");
			}
			if (!optionOrder.keys  || !optionOrder.dir) {
				throw new InsightError("order should have keys and dir");
			}
			let orderKeys = Object.keys(optionOrder);
			let orderKeyColumns = optionOrder[orderKeys[1]];
			let orderRules = ["UP", "DOWN"];
			if (!orderRules.includes(optionOrder.dir)) {
				throw new InsightError("order rule should be down or up");
			} else {
				// ORDER[keys] is an array, each column is valid id_field || allNewNames
				orderKeyColumns.forEach((key: string) => {
					if (!optionColumn.includes(key)) {
						throw new InsightError("each column is valid id_field || allNewNames");
					}
				});
			}
		}
	}

	return true;
}


