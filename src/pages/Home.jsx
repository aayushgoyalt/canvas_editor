import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	collection,
	addDoc,
	serverTimestamp,
	onSnapshot,
	orderBy,
	query,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Home() {
	const navigate = useNavigate();
	const [canvases, setCanvases] = useState([]);

	// ✅ Fetch all canvases (real-time)
	useEffect(() => {
		const q = query(
			collection(db, "canvases"),
			orderBy("updatedAt", "desc")
		);
		const unsubscribe = onSnapshot(q, (snapshot) => {
			const list = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			setCanvases(list);
		});

		return () => unsubscribe();
	}, []);

	// ✅ Create new canvas
	async function handleCreate() {
		const docRef = await addDoc(collection(db, "canvases"), {
			title: "Untitled",
			data: null,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
			lastModifiedBy: null,
		});
		navigate(`/canvas/${docRef.id}`);
	}

	return (
		<div className="relative flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 px-6 py-10">
			{/* Floating Decorations */}
			<div className="absolute top-16 left-20 w-24 h-24 bg-blue-200 rounded-full blur-3xl opacity-40 animate-pulse"></div>
			<div className="absolute bottom-24 right-20 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-40 animate-pulse"></div>

			{/* Header */}
			<h1 className="text-4xl font-extrabold text-gray-800 mb-10 tracking-tight text-center z-10">
				🎨 Fabric.js Canvas Dashboard
			</h1>

			{/* Card Container */}
			<div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-200 z-10">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold text-gray-700">
						My Canvases
					</h2>
					<button
						onClick={handleCreate}
						className="group relative inline-flex items-center justify-center px-5 py-2 font-semibold text-white text-base rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-md transition-all duration-300 hover:scale-[1.03]"
					>
						<span className="mr-2 text-lg">➕</span>
						New Canvas
					</button>
				</div>

				{/* Canvases List */}
				{canvases.length === 0 ? (
					<p className="text-gray-500 text-center py-10">
						No canvases yet. Click “New Canvas” to create one!
					</p>
				) : (
					<ul className="divide-y divide-gray-200">
						{canvases.map((canvas) => (
							<li
								key={canvas.id}
								onClick={() => navigate(`/canvas/${canvas.id}`)}
								className="flex items-center justify-between py-4 px-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
							>
								<div className="flex flex-col">
									<span className="font-semibold text-gray-800">
										{canvas.id || "Untitled"}
									</span>
									<span className="text-sm text-gray-500">
										Created{" "}
										{canvas.createdAt?.toDate
											? canvas.createdAt
													.toDate()
													.toLocaleString()
											: "—"}
									</span>
								</div>
								<div className="text-sm text-gray-500">
									Last Updated:{" "}
									{canvas.updatedAt?.toDate
										? canvas.updatedAt
												.toDate()
												.toLocaleString()
										: "—"}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
