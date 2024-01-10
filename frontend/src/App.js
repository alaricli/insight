import React, {useState} from "react";
import FindCourseModal from "./Component/Modal/findCourseModal";
import CourseInfoModal from "./Component/Modal/courseInfoModal";
import './App.css';

function App() {
	const [showModal, setShowModal] = useState(false);
	const [modalContent, setModalContent] = useState("");

	const handleFindCourseBtn = () => {
		if (modalContent === 'find') {
			setShowModal(!showModal);
		}
		if (modalContent === 'info') {
			setModalContent('find');
		} else {
			setModalContent('find');
			setShowModal(true);
		}
	};

	const handleCourseInfoBtn = () => {
		if (modalContent === 'info') {
			setShowModal(!showModal);
		}
		if (modalContent === 'find') {
			setModalContent('info');
		} else {
			setModalContent('info');
			setShowModal(true);
		}
	};

	return (
		<div className={"App"}>
			<header>
				<h1 className={"App-header-text"}>
					UBC Insight
				</h1>
			</header>
			<div className={"Buttons"}>
				<button id={"find-course-btn"} onClick={handleFindCourseBtn} className={"Button"}>
					View Grades
				</button>
				&nbsp;
				<button id={"course-info-btn"} onClick={handleCourseInfoBtn} className={"Button"}>
					Course Info
				</button>
				{showModal && modalContent === 'find' &&
					<FindCourseModal content={modalContent} closeModal={() => setShowModal(false)}/>}
				{showModal && modalContent === 'info' &&
					<CourseInfoModal content={modalContent} closeModal={() => setShowModal(false)}/>}
			</div>
		</div>
	);
}

export default App;
