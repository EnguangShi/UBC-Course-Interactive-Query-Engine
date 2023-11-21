import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect} from "chai";
import {clearDisk, getContentFromArchives} from "../TestUtil";

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;
	this.timeout(10000);
	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
		rooms: "./test/resources/archives/rooms.zip",
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		// This is a unit test. You should create more like this!

		// Add Test

		describe("Add dataset test", function () {
			beforeEach(function () {
				clearDisk();
			});

			it("Should add a valid course dataset", function () {
				const id: string = "courses";
				const content: string = datasetContents.get("courses") ?? "";
				const expected: string[] = [id];
				return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
					expect(result).to.deep.equal(expected);
				});
			});

			it("Should add a valid rooms dataset", function () {
				const id: string = "rooms";
				const content: string = datasetContents.get("rooms") ?? "";
				const expected: string[] = [id];
				return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result: string[]) => {
					expect(result).to.deep.equal(expected);
				});
			});

			it("add duplicate sets", async function () {
				try {
					const id: string = "courses";
					const content: string = datasetContents.get("courses") ?? "";
					const expected: string[] = [id];
					insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
						expect(result).to.deep.equal(expected);
					});
					const id2: string = "courses";
					const content2: string = datasetContents.get("courses") ?? "";
					insightFacade.addDataset(id2, content2, InsightDatasetKind.Courses).then((result: string[]) => {
						expect.fail();
					});
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});

			it("Should add two valid datasets", function () {
				const id: string = "courses";
				const content: string = datasetContents.get("courses") ?? "";
				const expected: string[] = [id];
				const id2: string = "courses-2";
				const content2: string = datasetContents.get("courses") ?? "";
				const expected2: string[] = [id, id2];
				return insightFacade
					.addDataset(id, content, InsightDatasetKind.Courses)
					.then(() => insightFacade.addDataset(id2, content2, InsightDatasetKind.Courses))
					.then((result: string[]) => {
						expect(result).to.deep.equal(expected2);
					});
			});

			it("add underscore sets", async function () {
				try {
					const id: string = "_courses";
					const content: string = datasetContents.get("_courses") ?? "";
					insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
						expect.fail();
					});
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});

			it("add zero column sets", async function () {
				try {
					const id: string = "courses";
					const content: string = getContentFromArchives("zeroColumns.zip");
					insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
						expect.fail();
					});
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});

			it("add invalid content sets", async function () {
				try {
					const id: string = "courses";
					const content: string = " ";
					insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
						expect.fail();
					});
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});

			it("add whitespace sets", async function () {
				try {
					const id: string = " ";
					const content: string = datasetContents.get("courses") ?? "";
					insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
						expect.fail();
					});
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});

			it("add invalid sets", async function () {
				try {
					const id: string = "courses";
					const content: string = getContentFromArchives("invalidTest.zip");
					insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
						expect.fail();
					});
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});
		});

		describe("List Datasets", async function () {
			beforeEach(function () {
				clearDisk();
			});

			it("should list no datasets", function () {
				return insightFacade.listDatasets().then((insightDatasets: InsightDataset[]) => {
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(0);
				});
			});

			it("should list one course dataset", function () {
				const courses: string = getContentFromArchives("courses.zip");
				return insightFacade
					.addDataset("courses", courses, InsightDatasetKind.Courses)
					.then(() => insightFacade.listDatasets())
					.then((insightDatasets) => {
						expect(insightDatasets).to.deep.equal([
							{
								id: "courses",
								kind: InsightDatasetKind.Courses,
								numRows: 64612,
							},
						]);
					});
			});

			it("should list one room dataset", function () {
				const courses: string = getContentFromArchives("rooms.zip");
				return insightFacade
					.addDataset("rooms", courses, InsightDatasetKind.Rooms)
					.then(() => insightFacade.listDatasets())
					.then((insightDatasets) => {
						expect(insightDatasets).to.deep.equal([
							{
								id: "rooms",
								kind: InsightDatasetKind.Rooms,
								numRows: 364,
							},
						]);
					});
			});

			it("should list multiple datasets", function () {
				const rooms: string = getContentFromArchives("rooms.zip");
				const courses: string = getContentFromArchives("courses.zip");
				return insightFacade
					.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
					.then(() => {
						return insightFacade.addDataset("courses", courses, InsightDatasetKind.Courses);
					})
					.then(() => insightFacade.listDatasets())
					.then((insightDatasets) => {
						expect(insightDatasets).to.be.an.instanceOf(Array);
						expect(insightDatasets).to.have.length(2);

						const insightDatasetRooms = insightDatasets.find((dataset) => dataset.id === "rooms");
						expect(insightDatasetRooms).to.exist;
						expect(insightDatasetRooms).to.deep.equal({
							id: "rooms",
							kind: InsightDatasetKind.Rooms,
							numRows: 74,
						});
						const insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "courses");
						expect(insightDatasetCourses).to.exist;
						expect(insightDatasetCourses).to.deep.equal({
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						});
					});
			});
		});

		describe("remove Datasets", function () {
			beforeEach(function () {
				clearDisk();
			});

			let courses: string = getContentFromArchives("courses.zip");

			it("remove one set", async function () {
				try {
					await insightFacade.addDataset("courses", courses, InsightDatasetKind.Courses);
					await insightFacade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
					await insightFacade.removeDataset("courses");
					const insightDatasets = await insightFacade.listDatasets();
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(1);
					const insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "courses-2");
					expect(insightDatasetCourses).to.exist;
					expect(insightDatasetCourses).to.deep.equal({
						id: "courses-2",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});
				} catch {
					expect.fail();
				}
			});

			it("not found error", async function () {
				try {
					await insightFacade.addDataset("courses", courses, InsightDatasetKind.Courses);
					await insightFacade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
					await insightFacade.removeDataset("courses-3");
					expect.fail();
				} catch (err) {
					expect(err).to.be.instanceof(NotFoundError);
				}
			});

			it("blank space error", async function () {
				try {
					await insightFacade.addDataset("courses", courses, InsightDatasetKind.Courses);
					await insightFacade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
					await insightFacade.removeDataset(" ");
					expect.fail();
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});

			it("underscore error", async function () {
				try {
					await insightFacade.addDataset("courses", courses, InsightDatasetKind.Courses);
					await insightFacade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
					await insightFacade.removeDataset("_courses");
					expect.fail();
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});

			it("remove dataset from empty list", async function () {
				try {
					await insightFacade.removeDataset("courses");
					expect.fail();
				} catch (err) {
					expect(err).to.be.instanceof(NotFoundError);
				}
			});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
				insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(actual, expected) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});
