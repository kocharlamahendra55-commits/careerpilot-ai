import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { RecruiterHeader } from "@/components/layout/RecruiterHeader";

export const metadata: Metadata = {
  title: "Recruiter Dashboard – CareerPilot AI",
};

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RecruiterHeader />
      {children}
    </AuthProvider>
  );
}
