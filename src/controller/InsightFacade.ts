import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";
import {containsUnderscore, isOnlyWhiteSpace, isValid, 	isValidCourse,
	isValidRoom, isValidSection, readEachFile} from "./ValidationChecks";
import {
	searchNodesWithName,
	getBuildingGeoLocation,
	getContentInAWithClass,
	getContentInTDWithClass,
	getRooms,
	countNumberOfRooms} from "./AddRoomHelpers";
import JSZip from "jszip";
import parse5, {Document} from "parse5";
import Dataset from "./Dataset";
import Section from "./Section";
import Room from "./Room";
import * as fs from "fs-extra";
import path from "path";

import Query from "./Query";
import {options, transformations, where} from "./RunQuery";
import {handleRoomList, hanldeRooms, loadMemory} from "./Helper";
import {handleRooms2} from "./Helper2";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public addedIdArr: string[];
	public addedDatasets: Dataset[];
	public emptySections: Section[];
	public emptyBuildings: Map<string, any[]>;
	public dataFolder = path.join(__dirname, "..", "..", "data");
	constructor() {
		this.addedIdArr = [];
		this.addedDatasets = [];
		this.emptySections = [];
		this.emptyBuildings = new Map<string, any[]>();
		if (!fs.existsSync(this.dataFolder)) {
			fs.mkdirSync(this.dataFolder);
		} else {
			console.log("--------exist");
		}
		loadMemory(this.addedIdArr, this.addedDatasets);
		console.log("InsightFacadeImpl::init()");
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// try {
		if (isOnlyWhiteSpace(id) || containsUnderscore(id)) {
			return Promise.reject(new InsightError("This id is invalid. Either contains '_' or only whitespaces"));
		}
		if (this.addedIdArr.some((addedId) => addedId === id)) {
			return Promise.reject(new InsightError("This dataset has been added. It could not be added again"));
		}
		if (kind === "rooms") {
			await this.addRooms(id, content, kind);
		} else if (kind === "courses") {
			await this.addCourses(id, content, kind);
		} else {
			return Promise.reject(new InsightError("Not a valid type"));
		}

		const dataFolder = path.join(__dirname, "..", "..", "data");
		if (!fs.existsSync(dataFolder)) {
			fs.mkdirSync(dataFolder);
		}
		const dir = path.join(__dirname, "..", "..", "data", id + ".json");
		if (kind === "rooms" && this.addedDatasets[this.addedIdArr.indexOf(id)]) {
			let tempRooms =  this.addedDatasets[this.addedIdArr.indexOf(id)];
			if(Object.values(Object.fromEntries( this.addedDatasets[this.addedIdArr.indexOf(id)].buildings))){
				tempRooms.buildings = Object.fromEntries(this.addedDatasets[this.addedIdArr.indexOf(id)].buildings);
				fs.writeFileSync(`data/${id}.json`, JSON.stringify(tempRooms));
			}
		}else{
			fs.writeFileSync(dir, JSON.stringify(this.addedDatasets[this.addedIdArr.indexOf(id)]));
		}
		// console.log(this.addedIdArr);
		return Promise.resolve(this.addedIdArr);
		// } catch {
		// 	return Promise.reject(new InsightError("try-catch error"));
		// }
	}

	private async addRooms(id: string, content: string, kind: InsightDatasetKind): Promise<void> {
		const bool = await isValidRoom(content);
		if (bool) {
			let zip = new JSZip();
			let result = await zip.loadAsync(content, {base64: true});
			let data = await result.folder("rooms")?.file("index.htm")?.async("string");
			if (data) {
				let indexDoc = parse5.parse(data);
				let nodesTd: parse5.ChildNode[] = [];
				searchNodesWithName("td", indexDoc.childNodes, nodesTd);
				let codes = getContentInTDWithClass("views-field views-field-field-building-code", nodesTd);
				let titles = getContentInAWithClass("views-field views-field-title", nodesTd);
				let addresses = getContentInTDWithClass("views-field views-field-field-building-address", nodesTd);
				let buildingsMap = new Map<string, any[]>();
				let promiseList = [];
				for (const i in codes) {
					promiseList.push(this.forEachBuilding(i, result, titles, codes, addresses, buildingsMap));
				}
				await Promise.all(promiseList);
				const numRooms = countNumberOfRooms(buildingsMap);
				// console.log(buildingsMap);
				const newds = new Dataset(id, kind, numRooms, this.emptySections, buildingsMap);
				this.addedIdArr.push(id);
				this.addedDatasets.push(newds);
				// console.log(this.addedDatasets[this.addedIdArr.indexOf(id)].buildings);
			}
		} else {
			return Promise.reject(new InsightError("The file is not valid"));
		}
	}

	private async forEachBuilding(
		i: any,
		result: JSZip,
		titles: string[],
		codes: string[],
		addresses: string[],
		buildingsMap: Map<string, any[]>) {
		let buildingsData = await result
			.folder("rooms")
			?.folder("campus")
			?.folder("discover")
			?.folder("buildings-and-classrooms");
		let buildingData = await buildingsData?.file(codes[i])?.async("string");
		if (buildingData) {
			let buildingDoc = parse5.parse(buildingData);
			let geo = JSON.parse(await getBuildingGeoLocation(addresses[i]));
			let roomsArr = getRooms(buildingDoc, titles[i], codes[i], addresses[i], geo.lat, geo.lon);
			buildingsMap.set(codes[i], roomsArr);
		}
		return buildingsMap;
	}

	private async addCourses(id: string, content: string, kind: InsightDatasetKind): Promise<void> {
		let result;
		const bool = await isValidCourse(content);
		if (bool) {
			result = await this.takeOutSections(content);
		} else {
			return Promise.reject(new InsightError("The file is not valid"));
		}
		const newds = new Dataset(id, kind, result.length, result, this.emptyBuildings);
		this.addedIdArr.push(id);
		this.addedDatasets.push(newds);
	}

	private takeOutSections = (content: string): Promise<Section[]> => {
		let courseArr: JSON[] = [];
		let sectionArr: Section[] = [];
		return readEachFile(content)
			.then((contentArr) => {
				for (const course of contentArr) {
					if (isValidSection(course)) {
						courseArr.push(JSON.parse(course));
					}
				}
				return courseArr;
			})
			.then((result) => {
				for (const course of result) {
					let courseAny = course as any;
					for (const section of courseAny.result) {
						const dept: string = section.Subject;
						const id: string = section.Course;
						const avg: number = section.Avg;
						const instructor: string = section.Professor;
						const title: string = section.Title;
						const pass: number = section.Pass;
						const fail: number = section.Fail;
						const audit: number = section.Audit;
						// String(): convert number to string
						const uuid: string = String(section["id"]);
						let year: number;
						if (section.Section === "overall") {
							year = 1900;
						} else {
							// + convert string to number: https://stackoverflow.com/questions/14667713
							year = +section.Year;
						}
						// if (insideValidSection(dept, id, avg, instructor, title, pass, fail, audit, uuid, year)) {
						let sec: Section = new Section(
							dept, id, avg, instructor, title, pass, fail, audit, uuid, year);
						sectionArr.push(sec);
					}
				}
				return sectionArr;
			});
	};

	public removeDataset(id: string): Promise<string> {
		try {
			if (isOnlyWhiteSpace(id) || containsUnderscore(id)) {
				return Promise.reject(new InsightError("This id is invalid. Either contains '_' or only whitespaces"));
			}
			if (!this.addedIdArr.some((addedId) => addedId === id)) {
				return Promise.reject(new NotFoundError("This id is not found"));
			}
			const dataFolder = path.join(__dirname, "..", "..", "data");
			if (fs.existsSync(dataFolder)) {
				const dir = path.join(__dirname, "..", "..", "data", id + ".json");
				fs.removeSync(dir);
			}

			delete this.addedDatasets[this.addedIdArr.indexOf(id)];
			this.addedIdArr.splice(this.addedIdArr.indexOf(id), 1);
			return Promise.resolve(id);
		} catch {
			return Promise.reject(new InsightError("try-catch error"));
		}
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		loadMemory(this.addedIdArr, this.addedDatasets);
		// console.log(this.addedDatasets);
		if(this.addedDatasets.length === 0) {
			return Promise.reject(new InsightError("There is no dataset"));
		}
		let datasetId = this.getId(query);
		if (datasetId === "") {
			datasetId = "courses";
		}
		if(!this.addedIdArr.includes(datasetId)){
			return Promise.reject(new InsightError("No dataset in the query"));
		}
		let query1: any;
		query1 = new Query(query, datasetId);
		query1.checkQuery();
		let sections: any = [],  roomLists: any = [];
		this.addedDatasets.forEach((dataset) => {
			if (dataset.id === datasetId) {
				sections.push(dataset.sections);
				let tmpRoomsList: any[] = handleRooms2(dataset.buildings);
				roomLists.push(tmpRoomsList);
			}
		});
		let rooms = handleRoomList(roomLists);
		if (rooms[0].length !== 0) {
			sections = rooms;
		}
		let whereResult = where(query1.query["WHERE"], sections, this.getId(query));
		let queryLength = Object.keys(query1.query).length;
		let optionsResult: any[];
		if(queryLength === 3) {
			let transfromResult = transformations(query1.query["TRANSFORMATIONS"],
				whereResult, query1.query["OPTIONS"], datasetId);
			if(transfromResult.length > 5000){
				return Promise.reject(new ResultTooLargeError("More than 5000 result"));
			}
			optionsResult = options(query1.query["OPTIONS"], transfromResult);
		} else {
			if(whereResult.length > 5000){
				return Promise.reject(new ResultTooLargeError("More than 5000 result"));
			}
			optionsResult = options(query1.query["OPTIONS"], whereResult);
		}
		return Promise.resolve(optionsResult);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let resultArr: InsightDataset[] = [];
		this.addedDatasets.forEach((dataset) => {
			console.log(Promise.resolve(resultArr));
			resultArr.push({id: dataset.id, kind: dataset.kind, numRows: dataset.length});
		});
		console.log(Promise.resolve(resultArr));
		return Promise.resolve(resultArr);
	}

	private getId(query: any): string{
		let keys = Object.keys(query);
		let length = Object.keys(query).length;
		if (length > 3) {
			throw new InsightError("incorrect query length");
		}
		if (!keys.includes("WHERE")) {
			throw new InsightError("no where");
		}
		if (!keys.includes("OPTIONS")) {
			throw new InsightError("no options");
		}
		let columns = query["OPTIONS"]["COLUMNS"];
		if(columns === null || !Array.isArray(columns) || columns.length === 0) {
			throw new InsightError("no columns, invalid query");
		}
		let id = columns[0].substring(0, columns[0].indexOf("_") );
		return id;
	}
}
