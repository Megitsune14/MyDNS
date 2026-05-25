import { Outlet } from "react-router-dom";
import { BackgroundLayers, Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col">
      <BackgroundLayers />
      <Header />
      <div className="flex w-full flex-1">
        <Sidebar />
        <main className="w-full flex-1 px-4 py-6 lg:px-12 xl:px-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
