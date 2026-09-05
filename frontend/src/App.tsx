import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout/Layout";
import HomePage from "@/pages/HomePage";
import UploadPage from "@/pages/UploadPage";
import AnalysisPage from "@/pages/AnalysisPage";
import StoryboardPage from "@/pages/StoryboardPage";
import GenerationPage from "@/pages/GenerationPage";
import DownloadPage from "@/pages/DownloadPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="create" element={<UploadPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="storyboard" element={<StoryboardPage />} />
        <Route path="generate" element={<GenerationPage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
