import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout/Layout";
import GalleryPage from "@/pages/GalleryPage";
import EditorPage from "@/pages/EditorPage";

/** The library, and one template at a time. */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<GalleryPage />} />
        <Route path="/t/:templateId" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
