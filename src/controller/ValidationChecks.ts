import JSZip from "jszip";

let isZip = (content: string): Promise<boolean> => {
	// loadAsync(): https://stuk.github.io/jszip/documentation/api_jszip/load_async.html
	let zip = new JSZip();
	// if it's not a zip, loadAsync() will reject with an error
	return zip
		.loadAsync(content, {base64: true})
		.then(() => true)
		.catch(() => false);
};

let isDirCourses = (content: string): Promise<boolean> => {
	let zip = new JSZip();
	// Regular Expression: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	// const regex = new RegExp("^courses$");
	return (
		zip
			.loadAsync(content, {base64: true})
			// folder(regex): https://stuk.github.io/jszip/documentation/api_jszip/folder_regex.html
			// folder(regex) find folder names using regular expression and returns with an array of all instances
			.then((result) => zip.folder("courses") !== null)
	);
};

let isDirRooms = (content: string): Promise<boolean> => {
	let zip = new JSZip();
	// Regular Expression: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	// const regex = new RegExp("^courses$");
	return (
		zip
			.loadAsync(content, {base64: true})
			// folder(regex): https://stuk.github.io/jszip/documentation/api_jszip/folder_regex.html
			// folder(regex) find folder names using regular expression and returns with an array of all instances
			.then((result) => zip.folder("rooms") !== null)
	);
};

export let readEachFile = (content: string): Promise<string[]> => {
	let zip = new JSZip();
	return zip.loadAsync(content, {base64: true}).then((result) => {
		let contentArr: any[] = [];
		// iterate through the files: https://piazza.com/class/ky0cd80u11m7bs?cid=539
		// forEach(): https://stuk.github.io/jszip/documentation/api_jszip/for_each.html
		result.folder("courses")?.forEach((relativePath, file) => {
			// async(): https://stuk.github.io/jszip/documentation/api_zipobject/async.html
			// async("string") returns a Promise of the content in string type
			contentArr.push(file.async("string"));
		});
		return Promise.all(contentArr);
	});
};

let containsIndexHtm = (content: string): Promise<boolean> => {
	let zip = new JSZip();
	let exist = false;
	return zip.loadAsync(content, {base64: true}).then((result) => {
		exist = !!result.folder("rooms")?.file("index.htm");
		return exist;
	});
};

// check if valid JSON: https://stackoverflow.com/questions/3710204
// check if multiple keys are included: https://stackoverflow.com/questions/54881865
export let isValidSection = (course: string): boolean => {
	return true;
	const neededKeys = ["Subject", "Course", "Avg", "Professor", "Title", "Pass", "Fail", "Audit", "id", "Year"];
	let dataSet: JSON;
	try {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
		// JSON.parse(course) returns SyntaxError if course is not a valid JSON
		dataSet = JSON.parse(course);
	} catch (err) {
		return false;
	}
	// every(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
	// check if the course contains a valid section which includes all the needed keys
	return neededKeys.every((key) => Object.keys(dataSet).includes(key));
};

let containsOneSection = (content: string): Promise<boolean> => {
	return readEachFile(content).then((result) => {
		for (const course of result) {
			if (isValidSection(course)) {
				return true;
			}
		}
		return false;
	});
};

export let isValidCourse = (content: string): Promise<boolean> => {
	return isZip(content)
		.then((result) => {
			// console.log("a");
			return result ? isDirCourses(content) : false;
		})
		.then((result) => {
			// console.log("b");
			return result ? containsOneSection(content) : false;
		})
		.then((result) => result);
};

export let isValidRoom = (content: string): Promise<boolean> => {
	return isZip(content)
		.then((result) => {
			// console.log("a");
			return result ? isDirRooms(content) : false;
		})
		.then((result) => {
			return result ? containsIndexHtm(content) : false;
		})
		.then((result) => result);
};

export let isOnlyWhiteSpace = (id: string): boolean => {
	// replace all spaces to empty string and check the length
	// https://stackoverflow.com/questions/10261986
	return id.replace(/\s+/g, "").length === 0;
};

export let containsUnderscore = (id: string): boolean => {
	// /_/.test(id): test if id: string contains an underscore
	// https://careerkarma.com/blog/javascript-string-contains/
	return /_/.test(id);
};

export let isValid = (content: string): Promise<boolean> => {
	return isZip(content)
		.then((result) => {
			// console.log("a");
			return result ? isDirCourses(content) : false;
		})
		.then((result) => {
			// console.log("b");
			return result ? containsOneSection(content) : false;
		})
		.then((result) => result);
};
