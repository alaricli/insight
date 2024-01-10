import React from "react";
import './Modal.css';
import {renderTable} from "./renderTable";

export default class CourseInfoModal extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			course: null,
			startYear: null,
			endYear: null,
			result: null,
			datasetId: null,
			errorMessage: null,
		};
	}

	handleCourseChange = (event) => {
		this.setState({course: event.target.value})
	}

	handleStartYearChange = (event) => {
		this.setState({startYear: event.target.value});
	}

	handleEndYearChange = (event) => {
		this.setState({endYear: event.target.value});
	}

	listCourseInfo = () => {
		const startYear = parseInt(this.state.startYear);
		const endYear = parseInt(this.state.endYear);
		const course = this.state.course;
		const currYear = 2023;

		this.setState({result: null, errorMessage: ''});

		if (!this.state.startYear || !this.state.endYear || !this.state.course) {
			this.setState({errorMessage: "Please fill in all fields."});
			return;
		}
		if (!/^[a-zA-Z]{4} \d{3}[a-zA-Z]?$/.test(course)) {
			this.setState({errorMessage: "Invalid course name."});
			return;
		}
		if ((startYear || endYear) < 0 || (startYear || endYear) > currYear || startYear > endYear) {
			this.setState({errorMessage: "Invalid Year. Please enter a valid year range."});
			return;
		}

		const dept = course.substring(0, course.indexOf(' ')).toLowerCase();
		const id = course.substring(course.indexOf(' ') + 1);
		let datasetId = '';
		fetch('http://localhost:4321/datasets', {
			method: 'GET'
		})
			.then(response => response.json())
			.then(data => {
				let maybeId = this.getFirstSectionsId(data.result);
				if (!maybeId) {
					this.setState({errorMessage: 'No sections data found.'});
					return;
				}
				datasetId = maybeId;
				return fetch('http://localhost:4321/query', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						WHERE: {
							AND: [
								{GT: {[`${datasetId}_year`]: startYear}},
								{LT: {[`${datasetId}_year`]: endYear}},
								{IS: {[`${datasetId}_dept`]: dept}},
								{IS: {[`${datasetId}_id`]: id}}
							]
						},
						OPTIONS: {
							COLUMNS: [
								`${datasetId}_dept`,
								`${datasetId}_id`,
								`${datasetId}_avg`,
								`${datasetId}_year`
							],
							ORDER: {
								dir: "DOWN",
								keys: [
									`${datasetId}_year`,
									`${datasetId}_avg`
								]
							}
						}
					})
				});
			})
			.then(response => response.json())
			.then(data => {
				if ("error" in data) {
					this.setState({errorMessage: data.error});
				} else if (data.result.length === 0) {
					this.setState({errorMessage: "No matching data found."});
				} else {
					this.setState({
						result: data.result,
						datasetId: datasetId
					});
				}
			})
			.catch(error => console.error('There was an error!', error));
	}

	getFirstSectionsId(insightDatasets) {
		for (const dataset of insightDatasets) {
			if (dataset.kind === "sections") {
				return dataset.id;
			}
		}
		return null;
	}

	render() {
		const {content, closeModal} = this.props;
		const {result, datasetId, errorMessage} = this.state;

		return (
			<div className={"modal-container"}>
				{content === 'info' && (
					<div className={"description"}>
						Information by Course
						<div>
							<input
								className={"input"}
								type="string"
								placeholder="Enter Course (e.g. CPSC 310)"
								value={this.state.course}
								onChange={this.handleCourseChange}
							/>
							<input
								className={"input"}
								type="number"
								placeholder="Enter Min Year"
								value={this.state.startYear}
								onChange={this.handleStartYearChange}
							/>
							<input
								className={"input"}
								type="number"
								placeholder="Enter Max Year"
								value={this.state.endYear}
								onChange={this.handleEndYearChange}
							/>
							<button onClick={this.listCourseInfo}>Search</button>
							<button onClick={closeModal}>Close</button>
						</div>
						<div>
							{errorMessage && <div className="error-message">{errorMessage}</div>}
							{renderTable(result, datasetId)}
						</div>
					</div>
				)}
			</div>
		);
	}
}
