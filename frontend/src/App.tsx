import { ReactNode, useEffect, useState } from "react";
import { api } from "./api";
import type { Department } from "./types";
import Sidebar from "./components/Sidebar";
import Desk from "./pages/Desk";
import Departments from "./pages/Departments";
import Crew from "./pages/Crew";
import Board from "./pages/Board";
import CalendarPage from "./pages/CalendarPage";

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash || "#/desk");
  useEffect(() => {
    const on = () => setHash(window.location.hash || "#/desk");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

const routeFor = (hash: string): { view: string; param?: string } => {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  return { view: parts[0] || "desk", param: parts[1] };
};

export default function App() {
  const hash = useHash();
  const { view, param } = routeFor(hash);
  const [departments, setDepartments] = useState<Department[]>([]);

  const refreshDepts = () => api.departments().then(setDepartments).catch(() => {});
  useEffect(() => {
    refreshDepts();
  }, []);

  let page: ReactNode;
  switch (view) {
    case "departments":
      page = <Departments deptKey={param} />;
      break;
    case "crew":
      page = <Crew />;
      break;
    case "board":
      page = <Board />;
      break;
    case "calendar":
      page = <CalendarPage />;
      break;
    case "desk":
    default:
      page = <Desk onDepartmentsChange={refreshDepts} />;
  }

  return (
    <div className="shell">
      <Sidebar departments={departments} active={view} />
      <main className="content">{page}</main>
    </div>
  );
}
