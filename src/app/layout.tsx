import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareerPilot AI – AI Resume Analyzer & Career Intelligence Platform",
  description:
    "Analyze your resume with AI, get ATS scores, skill gap insights, career roadmaps, and land your dream job. Powered by OpenRouter AI.",
  keywords: ["resume analyzer", "ATS score", "career roadmap", "AI career", "skill gap"],
  openGraph: {
    title: "CareerPilot AI",
    description: "AI-powered resume analysis and career intelligence platform.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} font-sans bg-[#050816] text-white antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
