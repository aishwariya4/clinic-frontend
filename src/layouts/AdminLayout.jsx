import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  return (
    <>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: "24px" }}>
        <Outlet />
      </main>
    </>
  );
}
