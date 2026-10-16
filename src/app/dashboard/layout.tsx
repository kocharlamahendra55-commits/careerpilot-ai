import { Sidebar } from "@/components/layout/Sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard – CareerPilot AI",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#050816] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-5 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
