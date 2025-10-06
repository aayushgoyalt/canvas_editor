// src/pages/CanvasEditor.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
	doc,
	getDoc,
	onSnapshot,
	setDoc,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CanvasEditor() {
	const { canvasId } = useParams();
	const canvasElRef = useRef(null);
	const fabricRef = useRef(null);
	const saveTimerRef = useRef(null);
	const isApplyingRemoteRef = useRef(false);
	const clientIdRef = useRef(
		Date.now().toString(36) + Math.random().toString(36).slice(2)
	);

	const [color, setColor] = useState("#000000");
	const [isDrawing, setIsDrawing] = useState(false);

	// 🧩 Initialize Fabric once
	useEffect(() => {
		let canvas;

		(async () => {
			const fabricModule = await import("fabric");
			const fabric =
				fabricModule.fabric || fabricModule.default || fabricModule;

			canvas = new fabric.Canvas(canvasElRef.current, {
				width: 1850,
				height: 820,
				backgroundColor: "#ffffff",
				preserveObjectStacking: true,
			});
			fabricRef.current = canvas;

			// Save debounce helper
			const scheduleSave = () => {
				if (isApplyingRemoteRef.current) return;
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = setTimeout(
					() => saveToFirestore(false),
					800
				);
			};

			canvas.on("object:added", scheduleSave);
			canvas.on("object:modified", scheduleSave);
			canvas.on("object:removed", scheduleSave);

			// Delete object with key
			const handleKey = (e) => {
				if (e.key === "Delete" || e.key === "Backspace") {
					const act = canvas.getActiveObjects();
					if (act.length) {
						act.forEach((o) => canvas.remove(o));
						canvas.discardActiveObject();
						canvas.requestRenderAll();
					}
				}
			};
			window.addEventListener("keydown", handleKey);

			return () => {
				window.removeEventListener("keydown", handleKey);
				canvas.dispose();
			};
		})();
	}, [canvasId]);

	// 🧠 Load Firestore data + real-time sync
	useEffect(() => {
		if (!canvasId) return;
		const canvasDoc = doc(db, "canvases", canvasId);

		// Initial load
		(async () => {
			const snap = await getDoc(canvasDoc);
			if (snap.exists() && snap.data().data) {
				await applyRemoteJSON(snap.data().data);
			}
		})();

		// Real-time updates
		const unsub = onSnapshot(canvasDoc, (snap) => {
			if (!snap.exists()) return;
			const data = snap.data();
			if (data.lastModifiedBy === clientIdRef.current) return;
			if (data.data) applyRemoteJSON(data.data);
		});

		return () => unsub();
	}, [canvasId]);

	// 🧩 Apply JSON properly
	async function applyRemoteJSON(json) {
		const canvas = fabricRef.current;
		if (!canvas) return;

		const fabricModule = await import("fabric");
		const fabric =
			fabricModule.fabric || fabricModule.default || fabricModule;

		isApplyingRemoteRef.current = true;

		canvas.loadFromJSON(json, () => {
			// ✅ Force immediate redraw after load
			canvas.renderAll();
			canvas.requestRenderAll();
			isApplyingRemoteRef.current = false;
		});
	}

	function sanitizeJSON(json) {
		// Deep clone and remove nested arrays inside path objects
		const clone = JSON.parse(
			JSON.stringify(json, (key, value) => {
				if (key === "path" && Array.isArray(value)) {
					// Convert path to a flat array of points as string
					return value.map((v) => v.join(",")).join(";");
				}
				return value;
			})
		);
		return clone;
	}

	// 💾 Save to Firestore
	async function saveToFirestore(manual = true) {
		const canvas = fabricRef.current;
		if (!canvas || !canvasId) return;
		try {
			const json = canvas.toJSON();
			const sanitized = sanitizeJSON(json); // ✅ sanitize pen paths

			await setDoc(
				doc(db, "canvases", canvasId),
				{
					data: sanitized,
					updatedAt: serverTimestamp(),
					lastModifiedBy: clientIdRef.current,
				},
				{ merge: true }
			);
			if (manual) alert("Saved!");
		} catch (err) {
			console.error("Save failed", err);
		}
	}

	// 🎨 Toolbar actions
	async function addRect() {
		const fabricModule = await import("fabric");
		const fabric =
			fabricModule.fabric || fabricModule.default || fabricModule;
		const rect = new fabric.Rect({
			left: 100,
			top: 100,
			fill: color || "#f87171",
			width: 120,
			height: 80,
		});
		fabricRef.current.add(rect);
	}

	async function addCircle() {
		const fabricModule = await import("fabric");
		const fabric =
			fabricModule.fabric || fabricModule.default || fabricModule;
		const circle = new fabric.Circle({
			left: 200,
			top: 150,
			radius: 50,
			fill: color || "#60a5fa",
		});
		fabricRef.current.add(circle);
	}

	async function addText() {
		const fabricModule = await import("fabric");
		const fabric =
			fabricModule.fabric || fabricModule.default || fabricModule;
		const text = new fabric.IText("Edit me", {
			left: 250,
			top: 200,
			fontSize: 24,
			fill: color || "#000000",
		});
		fabricRef.current.add(text);
	}

	const togglePen = async () => {
		const fabricModule = await import("fabric");
		const fabric =
			fabricModule.fabric || fabricModule.default || fabricModule;

		const canvas = fabricRef.current;
		if (!canvas) return;

		const newMode = !isDrawing;
		setIsDrawing(newMode);
		canvas.isDrawingMode = newMode;

		if (newMode) {
			if (!canvas.freeDrawingBrush) {
				canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
			}
			const brush = canvas.freeDrawingBrush;
			brush.width = 4;
			brush.color = color || "#000000";
		}
	};

	const updateSelectedColor = (hex) => {
		setColor(hex);
		const obj = fabricRef.current?.getActiveObject();
		if (obj) {
			obj.set("fill", hex);
			fabricRef.current.requestRenderAll();
		}
	};

	// 🖼 UI
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
			<h2 className="text-2xl font-bold mb-4 text-gray-800">
				Canvas ID: <span className="text-blue-600">{canvasId}</span>
			</h2>

			{/* Toolbar */}
			<div className="flex flex-wrap items-center justify-center gap-3 bg-white p-3 rounded-xl shadow-md border border-gray-100 mb-6">
				<button
					onClick={addRect}
					className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
				>
					▭ Rect
				</button>
				<button
					onClick={addCircle}
					className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
				>
					⚪ Circle
				</button>
				<button
					onClick={addText}
					className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
				>
					✏️ Text
				</button>
				<button
					onClick={togglePen}
					className={`px-4 py-2 rounded-lg text-white ${
						isDrawing
							? "bg-yellow-600"
							: "bg-yellow-500 hover:bg-yellow-600"
					}`}
				>
					🖊 {isDrawing ? "Stop Drawing" : "Pen Tool"}
				</button>

				<label className="flex items-center gap-2 ml-4">
					<span className="text-gray-600 font-medium">🎨 Color:</span>
					<input
						type="color"
						value={color}
						onChange={(e) => updateSelectedColor(e.target.value)}
						className="w-10 h-10 border rounded-lg cursor-pointer"
					/>
				</label>

				<button
					onClick={() => saveToFirestore(true)}
					className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
				>
					💾 Save
				</button>
			</div>

			{/* Canvas */}
			<div className="bg-white border w-[90%] h-[80vh] border-gray-200 rounded-xl shadow-lg p-3">
				<canvas ref={canvasElRef} className="rounded-lg" />
			</div>

			<p className="text-gray-500 text-sm mt-4">
				Select shapes to resize or delete. Press <kbd>Delete</kbd> to
				remove.
			</p>
		</div>
	);
}
