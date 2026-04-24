// frontend/src/App.tsx
//
// v1 redesign — App is now a thin router shell.
// The old App.tsx contents moved to `pages/InterviewApp.tsx`.

import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import InterviewApp from "./pages/InterviewApp";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/interview" element={<InterviewApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
