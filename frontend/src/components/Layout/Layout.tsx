import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

export const Layout: React.FC = () => (
  <div className="flex min-h-screen flex-col">
    <Header />
    {/* Optically centres the single screen instead of pinning it to the top. */}
    <main className="flex flex-1 flex-col justify-center">
      <Outlet />
    </main>
    <Footer />
  </div>
);
