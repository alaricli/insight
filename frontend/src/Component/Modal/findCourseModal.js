import React from "react";
import './Modal.css';
import {renderTable} from "./renderTable";

export default class FindCourseModal extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			year: null,
			minAverage: null,
			result: null,
			datasetId: null,
			errorMessage: null,
		};
	}

	handleYearChange = (event) => {
		this.setState({year: event.target.value});
	}

	handleMinAverageChange = (event) => {
		this.setState({minAverage: event.target.value});
	}

	findCourse = () => {
		const year = parseInt(this.state.year);
		const minAverage = parseFloat(this.state.minAverage);
		const currYear = 2023;

		this.setState({result: null, errorMessage: ''});

		// Validation logic
		if (!this.state.year || !this.state.minAverage) {
			this.setState({ errorMessage: 'Please fill in all fields.' });
			return;
		}
		if (year < 0 || year > currYear) {
			this.setState({ errorMessage: 'Invalid year. Please enter a valid year.' });
			return;
		}
		if (minAverage < 0 || minAverage > 100) {
			this.setState({ errorMessage: 'Average cannot be less than 0 or more than 100.' });
			return;
		}

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
								{GT: {[`${datasetId}_year`]: year}},
								{GT: {[`${datasetId}_avg`]: minAverage}}
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
				{content === 'find' && (
					<div className={"description"}>
						View Grades
						<div>
							<input
								className={"input"}
								type="text"
								placeholder="Starting Year"
								value={this.state.year}
								onChange={this.handleYearChange}
							/>
							<input
								className={"input"}
								type="number"
								placeholder="Min. Average"
								value={this.state.minAverage}
								onChange={this.handleMinAverageChange}
							/>
							<button onClick={this.findCourse}>Search</button>
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
