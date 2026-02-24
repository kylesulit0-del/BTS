import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Members from "./pages/Members";
import MemberDetail from "./pages/MemberDetail";
import Tours from "./pages/Tours";
import News from "./pages/News";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/news" element={<News />} />
          </Routes>
        </main>
        <Navbar />
      </div>
    </BrowserRouter>
  );
}
