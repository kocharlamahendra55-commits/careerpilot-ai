import { Sidebar } from "@/components/layout/Sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel – CareerPilot AI",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#050816] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
