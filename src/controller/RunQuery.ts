import {InsightError} from "./IInsightFacade";
import {applyHelper, compareColumn, group, manageNewGroup, multiOrderHelper} from "./Helper";
import {copySync} from "fs-extra";
import {pushAllHelper} from "./Helper2";

const SINGLERULE: string[] = ["IS", "GT", "EQ", "LT"];
const MULTIRULE: string[] = ["AND", "OR"];
const validCols: string[] = ["dept", "id", "avg", "instructor", "pass", "fail", "title", "audit", "uuid", "year"];
const validRoomCols: string[] = ["fullname", "shortname", "number",
	"name", "address", "lat", "lon", "seats", "type", "furniture","href"];

	// changed method signature
export function where(wherequery: any, source: any[], id: string): any {
	let finalResult: any[] = [];
	let rootKey = Object.keys(wherequery)[0];
	if (wherequery[rootKey] === undefined) {
		pushAllHelper(source, finalResult);
	} else {
		let filterKey = Object.keys(wherequery[rootKey])[0];
		let columnLooking = filterKey.split("_")[1];
		let value = wherequery[rootKey][filterKey];
		if (SINGLERULE.includes(rootKey)) {
			switch (rootKey) {
				case "GT": source.forEach((sourceData) => {
					sourceData.forEach((sec: any) => {
						if (sec[columnLooking] > value) {
							finalResult.push(sec);
						}
					});
				});
					break;
				case "LT": source.forEach((sourceData) => {
					sourceData.forEach((sec: any) => {
						if (sec[columnLooking] < value) {
							finalResult.push(sec);
						}
					});
				});
					break;
				case "EQ": source.forEach((sourceData) => {
					sourceData.forEach((sec: any) => {
						if (sec[columnLooking] === value) {
							finalResult.push(sec);
						}
					});
				});
					break;
				case "IS":
					finalResult = isHelper(source, value, columnLooking);
					break;
				default:
					throw new InsightError("invalid where key");
			}
		} else if (MULTIRULE.includes(rootKey)) {
			let keyList = wherequery[rootKey];
			finalResult = multiruleHelper(keyList, source, rootKey, id);
		} else if (rootKey === "NOT") {
			finalResult = notHelper(wherequery[rootKey], source, columnLooking, id);
		}
	}
	return finalResult;
}

// added id parameter
function notHelper(keyList: any[], source: any[], columnLooking: any, id: string) {
	let tmpResult: any[] = where(keyList, source, id); // added id parameter
	let finalResult: any[] = [];
	source.forEach((sourceData) => {
		if (finalResult.length === 0) {
			finalResult = getArraysNotIn(sourceData, tmpResult);
		} else {
			let tmpResult2 = getArraysNotIn(sourceData, tmpResult);
			finalResult = getArrayUnion(finalResult, tmpResult2);
		}
	});
	return finalResult;
}

function multiruleHelper(keyList: any[], source: any[], rootKey: any, id: string) { // added id parameter
	let results: any[] = [];
	let flag = 0;
	keyList.forEach((keys: any) => {
		if (rootKey === "AND" && flag === 0) {
			let tmpRes = where(keys, source, id); // added id parameter
			if (tmpRes.length === 0 ) {
				flag = 1;
			}
		}
	});
	if (flag === 0) {
		keyList.forEach((keys: any) => {
			let innerResult = where(keys, source, id); // added id parameter
			if (rootKey === "OR") {
				if (results.length === 0) {
					results = innerResult;
				} else {
					results = getArrayUnion(results, innerResult);
				}
			} else if (rootKey === "AND") {
				if (results.length === 0 && innerResult.length !== 0) {
					results = innerResult;
				} else if (results.length === 0 && innerResult.length === 0) {
					results = [];
				} else {
					results = getArraysIntersection(results, innerResult);
				}
			}
		});
	}
	return results;
}

function getArraysIntersection(a1: any[], a2: any[]) {
	return  a1.filter(function(n) {
		return a2.indexOf(n) !== -1;
	});
}

function getArraysNotIn(a1: any[], a2: any[]) {
	return  a1.filter(function(n) {
		return a2.indexOf(n) === -1;
	});
}

function getArrayUnion(a1: any[], a2: any[]) {
	let concatArr = a1.concat(a2);
	let result = concatArr.filter((item, idx) => concatArr.indexOf(item) === idx);
	return result;
}

function isHelper(source: any[], value: any, column: any) {
	let astFirst: boolean = false;
	let astLast: boolean = false;
	let results: any = [];
	if (value.includes("*")) {
		if (value === "*" || value === "**") {
			results = isResultHelper(source, value, column, 0);
		}
		let first = value.substring(0,1);
		let last = value.substring(value.length - 1, value.length);
		if (first === "*") {
			astFirst = true;
		}
		if (last === "*") {
			astLast = true;
		}
		if (!astLast && !astFirst) {
			throw new InsightError("should contain at least one *");
		} else if (astLast && astFirst) {
			let target = value.substring(1, value.length - 1);
			results = isResultHelper(source, target, column, 0);
		} else if (astFirst && !astLast) {
			let target = value.substring(1, value.length);
			results = isResultHelper(source, target, column, 1);
		} else if (!astFirst && astLast) {
			let target = value.substring(0, value.length - 1);
			results = isResultHelper(source, target, column, 2);
		} else {
			throw new InsightError("should not have this situation");
		}
	} else {
		source.forEach((sourceData) => {
			sourceData.forEach((sec: any) => {
				if (sec[column] === value) {
					results.push(sec);
				}
			});
		});
	}
	return results;
}

function isResultHelper(source: any[], target: any, column: any, state: number) {
	let results: any[] = [];
	if (target === "*" || target === "**") {
		source.forEach((sourceData) => {
			sourceData.forEach((sec: any) => {
				results.push(sec);
			});
		});
	} else {
		source.forEach((sourceData) => {
			sourceData.forEach((sec: any) => {
				if (state === 0) {
					if (sec[column].includes(target)) {
						results.push(sec);
					}
				} else if (state === 1) {
					let flag = 0;
					let len = sec[column].length - target.length;
					if (sec[column].indexOf(target) === len && len > 0) {
						flag = 1;
					}
					if (flag === 1) {
						results.push(sec);
					}
				} else if (state === 2) {
					let flag = 0;
					if (sec[column].indexOf(target) === 0) {
						flag = 1;
					}
					if (flag === 1) {
						results.push(sec);
					}
				} else {
					throw new InsightError("this should not happen");
				}
			});
		});
	}
	return results;
}

export function transformations(transQuery: any, whereRes: any[], optionQuery: any, datasetID: any) {
	let groupList: any[] = [];
	let columnKey = Object.keys(optionQuery)[0];
	let columnsInOptions = optionQuery[columnKey];
	transQuery["GROUP"].forEach((column: any) => {
		groupList.push(column);
	});
	let groupResult = group(groupList, whereRes);
	let applyRes = groupResult;
	if (transQuery["APPLY"].length !== 0) {
		applyRes = applyHelper(transQuery["APPLY"], groupResult, groupList, columnsInOptions, datasetID);
	} else {
		applyRes = manageNewGroup(groupResult, groupList, []);
	}
	return applyRes;
}

export function options(optionQuery: any, lastRes: any[]) {
	let finalResult = [];
	let tmpResult: any[] = lastRes;
	let column = Object.keys(optionQuery)[0];
	let columnsInOptions = optionQuery[column];
	let order = Object.keys(optionQuery)[1];
	if(Object.keys(optionQuery).length === 2) {
		let orderObj = optionQuery[Object.keys(optionQuery)[1]];
		let orderType = typeof orderObj;
		if (orderType === "object") {
			let orderOrObj = Object.keys(orderObj);
			let dirObj = orderObj[orderOrObj[0]];
			let sortColumns = orderObj[orderOrObj[1]];
			tmpResult = multiOrderHelper(dirObj, sortColumns, lastRes, columnsInOptions);
		} else {
			let orderColumn = optionQuery[order];
			if (!columnsInOptions.includes(orderColumn)) {
				throw new InsightError("order key not in option columns");
			}
			tmpResult = singleOrderHelper("UP", orderColumn, lastRes);
		}
	}
	let selectColumns = optionQuery[column];
	finalResult = selectCoulmns(tmpResult, selectColumns);
	return finalResult;
}

function selectCoulmns(lastRes: any[], columns: any[]) {
	let finalRes: any[];
	finalRes = [];
	if (columns.length === 0) {
		return [];
	}
	lastRes.forEach((sec) => {
		let selectSec: {[key: string]: any} = {};
		columns.forEach((coln: any) => {
			let tmpColn = coln.split("_")[1];
			if (validCols.includes(tmpColn) || validRoomCols.includes(tmpColn)) {
				selectSec[coln] = sec[tmpColn];
			} else {
				selectSec[coln] = sec[coln];
			}
		});
		finalRes.push(selectSec);
	});
	return finalRes;
}

function singleOrderHelper(direction: any, orderColumn: any, lastRes: any[]) {
	let dir = 1;
	if (direction === "UP") {
		dir = -1;
	}
	let newColumn = orderColumn.split("_")[1];
	let finalRes = lastRes.sort((a, b) => {
		if (a[newColumn] !== b[newColumn]) {
			return a[newColumn] > b[newColumn] ? -dir : dir;
		}
		return 0;
	});
	return finalRes;
}

