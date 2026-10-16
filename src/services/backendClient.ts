// Backend API client connecting Next.js to FastAPI
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
const API_BASE = `${BACKEND_URL}/api/v1`;

class BackendClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  async parseFile(file: File): Promise<{ text: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/parse", { method: "POST", body: formData });
  }

  async analyzeFile(file: File): Promise<{ filename: string; resume_text: string; analysis: any }> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/analyze-file", { method: "POST", body: formData });
  }

  async analyzeText(text: string): Promise<{ analysis: any }> {
    return this.request("/analyze-text", {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async matchJob(resumeText: string, jobDescription: string): Promise<{ match: any }> {
    return this.request("/match-job", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async generateRoadmap(resumeText: string, targetRole: string): Promise<{ roadmap: any }> {
    return this.request("/generate-roadmap", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText, target_role: targetRole }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async generateInterviewPrep(resumeText: string, jobDescription?: string): Promise<{ interview_prep: any }> {
    return this.request("/interview-prep", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription || "" }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async analyzeSkillGap(resumeText: string, targetRole: string): Promise<{ skill_gap: any }> {
    return this.request("/skill-gap", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText, target_role: targetRole }),
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const backendClient = new BackendClient();
