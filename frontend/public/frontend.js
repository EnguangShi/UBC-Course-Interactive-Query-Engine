document.getElementById("address").addEventListener("click", handleRadioChecked);
document.getElementById("average").addEventListener("click", handleRadioChecked);
document.getElementById("submit").addEventListener("click", handleSubmit);

function handleRadioChecked() {
	if (document.getElementById('address').checked) {
		placeHolder = "Course's Department (e.g. CPSC)"
	} else {
		placeHolder = "Course's Code (e.g. CPSC 310)"
	}
	document.getElementById("input").setAttribute("placeholder", placeHolder);
}

function sendReq(finalQ) {
	console.log("sendR");
	return new Promise((resolve, reject) => {
		const postReq = new XMLHttpRequest();
		const json = JSON.stringify(finalQ);
		postReq.open("POST", "http://localhost:4321/query");
		postReq.setRequestHeader("Content-type", "application/json");
		postReq.send(json);
		postReq.onload = function() {
			let result = JSON.parse(postReq.response);
			console.log(result);
			if (postReq.status === 200) {
				console.log("resolve!!!!");
				return resolve(result);
			}else{
				console.log("reject");
				console.log(postReq.responseText);
				return reject(result);
			}
		};
	});
}

function handleSubmit() {
	let code = document.getElementById("input").value;
	let words = code.split(" ");
	let deptOrBuilding = words[0];
	let courseNum = words[1];
	const regex = /^[a-zA-Z0-9 ]*$/;

	if (document.getElementById('address').checked) {
		deptOrBuilding = deptOrBuilding.toLowerCase();
		if (!regex.test(code) || code.replace(/\s/g, "").length == 0) {
			alert("Please enter a valid department code");
			return;
		} else {
			let body = {
				"WHERE": {
					"IS": {
						"courses_dept": deptOrBuilding
					}
				},
				"OPTIONS": {
					"COLUMNS": ["courses_title", "courses_avg"],
					"ORDER": {
						"dir": "DOWN",
						"keys": [
							"courses_avg"
						]
					}
				}
			};
			let queryRes = sendReq(body);
			queryRes.then(result => {
				result = result["result"];
				// TODO: uncomment these after implementing query
				if (result.length == 0) {
					document.getElementById("result1").innerHTML = "No matching department.";
					document.getElementById("result2").innerHTML = "Please check the department code again.";
				} else {
					let avgKey = Object.keys(result[0])[1];
					let avgResult = result[0][avgKey];
					let titleKey = Object.keys(result[0])[0];
					let titleResult = result[0][titleKey];
					document.getElementById("result1").innerHTML = titleResult;
					document.getElementById("result2").innerHTML = avgResult;
				}

				// TODO: comment the next two lines after implementing query
				// document.getElementById("result1").innerHTML = "intr sftwr eng";
				// document.getElementById("result2").innerHTML = "75";
			})
		}
		// deptOrBuilding = deptOrBuilding.toUpperCase();
		// if (!regex.test(code) || code.replace(/\s/g, "").length == 0) {
		// 	alert("Please enter a valid building code");
		// 	return;
		// } else {
		// 	let body = {
		// 		"WHERE": {
		// 			"IS": {
		// 				"rooms_shortname": deptOrBuilding
		// 			}
		// 		},
		// 		"OPTIONS": {
		// 			"COLUMNS": ["rooms_fullname", "rooms_address"],
		// 		}
		// 	};
		// 	let queryRes = sendReq(body);
		// 		queryRes.then(result => {
		// 			result = result["result"];
		// 			// TODO: uncomment these after implementing query
		// 			if (result.length == 0) {
		// 				document.getElementById("result1").innerHTML = "No address for this building.";
		// 				document.getElementById("result2").innerHTML = "Please check the buidling code again.";
		// 			} else {
		// 				let fullnameKey = Object.keys(result[0])[0];
		// 				let resultFullname = result[0][fullnameKey];
		// 				let addressKey = Object.keys(result[0])[1];
		// 				let resultAddress = result[0][addressKey];
		// 				document.getElementById("result1").innerHTML = resultFullname;
		// 			 document.getElementById("result2").innerHTML = resultAddress;
		// 			}
		//
		// 			// TODO: comment the next two lines after implementing query
		// 			// document.getElementById("result1").innerHTML = "Institute for Computing";
		// 			// document.getElementById("result2").innerHTML = "2366 Main Mall";
		// 		})
		// }
	}
	if (document.getElementById('average').checked) {
		deptOrBuilding = deptOrBuilding.toLowerCase();
		if (!regex.test(code) || code.replace(/\s/g, "").length == 0) {
			alert("Please enter a valid course code");
			return;
		} else {
			let body = {
				"WHERE": {
					"AND": [
						{
							"IS": {
								"courses_dept": deptOrBuilding
							}
						},
						{
							"IS": {
								"courses_id": courseNum
							}
						}
					]

				},
				"OPTIONS": {
					"COLUMNS": ["courses_title", "courses_avg"],
					"ORDER": "courses_avg"
				}
			};
			let queryRes = sendReq(body);
				queryRes.then(result => {
					result = result["result"];
					// TODO: uncomment these after implementing query
					if (result.length == 0) {
						document.getElementById("result1").innerHTML = "No average for this course.";
						document.getElementById("result2").innerHTML = "Please check the course code again.";
					} else {
						let sectionNum = 0;
						let sectionAvgSum = 0;
						for (const insightResult of result) {
							let avgKey = Object.keys(insightResult)[1];
							sectionAvgSum = sectionAvgSum + insightResult[avgKey];
							sectionNum = sectionNum + 1;
						}
						let avgResult = Math.round(sectionAvgSum * 100.0 / sectionNum) / 100;
					 let titleKey = Object.keys(result[0])[0];
					 let titleResult = result[0][titleKey];
						document.getElementById("result1").innerHTML = titleResult;
					 document.getElementById("result2").innerHTML = avgResult;
					}

					// TODO: comment the next two lines after implementing query
					// document.getElementById("result1").innerHTML = "intr sftwr eng";
					// document.getElementById("result2").innerHTML = "75";
				})
		}
	}
}
