import React from "react";
import './Table.css';

export function renderTable(result, datasetId) {
	if (!result || result.length === 0) {
		return <p></p>;
	}

	return (
		<table>
			<thead>
			<tr>
				<th>Course</th>
				<th>Average</th>
				<th>Year</th>
			</tr>
			</thead>
			<tbody>
			{result.map((course, index) => (
				<tr key={index}>
					<td>{course[`${datasetId}_dept`].toUpperCase() + ' ' + course[`${datasetId}_id`]}</td>
					<td>{course[`${datasetId}_avg`]}</td>
					<td>{course[`${datasetId}_year`]}</td>
				</tr>
			))}
			</tbody>
		</table>
	);
}

