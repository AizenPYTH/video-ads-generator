import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout/Layout";
import StudioPage from "@/pages/StudioPage";

/** One screen. Everything happens on it. */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<StudioPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
