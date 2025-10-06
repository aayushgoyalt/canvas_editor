import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CanvasEditor from "./pages/CanvasEditor";
import "./index.css";

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/canvas/:canvasId" element={<CanvasEditor />} />
		</Routes>
	);
}
