import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AudioToScriptPage from "./pages/AudioToScriptPage";
import ConversionTwoPage from "./pages/ConversionTwoPage";
import DataloopUploadPage from "./pages/DataloopUploadPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/audio-to-script" element={<AudioToScriptPage />} />
        <Route path="/conversion-two" element={<ConversionTwoPage />} />
        <Route path="/dataloop-upload" element={<DataloopUploadPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;