import {InsightDatasetKind} from "./IInsightFacade";
import Section from "./Section";
import {isValidSection, readEachFile} from "./ValidationChecks";

export default class Dataset {
	public id: string;
	public length: number;
	public kind: InsightDatasetKind;
	public sections: Section[];
	// public buildings: Map<string, any[]>;
	public buildings: any;

	// constructor(
	// 	id: string,
	// 	kind: InsightDatasetKind,
	// 	length: number,
	// 	sections: Section[],
	// 	buildings: Map<string, any[]>) {
	// 	this.id = id;
	// 	this.kind = kind;
	// 	this.length = length;
	// 	this.sections = sections;
	// 	this.buildings = buildings;
	// }


	constructor(
		id: string,
		kind: InsightDatasetKind,
		length: number,
		sections: Section[],
		// changed buildings type to any
		buildings: Map<string, any[]>) {
		this.id = id;
		this.kind = kind;
		this.length = length;
		this.sections = sections;
		this.buildings = buildings;
	}

	// public insideValidSection = (
	// 	dept: string,
	// 	id: string,
	// 	avg: number,
	// 	instructor: string,
	// 	title: string,
	// 	pass: number,
	// 	fail: number,
	// 	audit: number,
	// 	uuid: string,
	// 	year: number): boolean => {
	// 	return this.found(dept)
	// 		&& this.found(id)
	// 		&& this.found(avg)
	// 		&& this.found(instructor)
	// 		&& this.found(title)
	// 		&& this.found(pass)
	// 		&& this.found(fail)
	// 		&& this.found(audit)
	// 		&& this.found(uuid)
	// 		&& this.found(year);
	// };
	//
	// private found = (feature: number | string): boolean => {
	// 	return feature !== null && feature !== undefined;
	// };
}
