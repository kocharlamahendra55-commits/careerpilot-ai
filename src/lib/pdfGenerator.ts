import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface ResumeAnalysisData {
  resumeText: string;
  jobDescription: string;
  analysis: any;
  timestamp: number;
  atsScore?: number;
  atsSummary?: string;
  atsBreakdown?: any;
  result?: any;
  roadmap?: any;
  interviewPrep?: any;
  skillGap?: any;
  skillGapDetails?: any[];
  filename?: string;
}

function extractCandidateName(resumeText: string): string {
  if (!resumeText || resumeText.length < 10) return "";
  const lines = resumeText.split("\n").filter(line => line.trim().length > 0);
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const looksLikeName = words.every(word => 
        /^[A-Z][a-z]+$/.test(word) || /^[A-Z]\.$/.test(word)
      );
      if (looksLikeName && line.length < 50) {
        return line;
      }
    }
  }
  return "";
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 6
): number {
  if (!text) return y;
  const lines = doc.splitTextToSize(text, maxWidth);
  const pageHeight = doc.internal.pageSize.height;
  for (const line of lines) {
    if (y + lineHeight > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function generateResumeAnalysisReport(data: ResumeAnalysisData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = 20;
  
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("CareerPilot AI", pageWidth / 2, 25, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Resume Analysis & Career Intelligence Report", pageWidth / 2, 35, { align: "center" });
  yPos = 60;
  
  const candidateName = extractCandidateName(data.resumeText);
  const analysisDate = new Date(data.timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  if (candidateName) {
    doc.setFont("helvetica", "bold");
    doc.text("Candidate:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(candidateName, margin + 30, yPos);
    yPos += 7;
  }
  
  if (data.filename) {
    doc.setFont("helvetica", "bold");
    doc.text("Resume File:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(data.filename, margin + 30, yPos);
    yPos += 7;
  }
  
  if (data.jobDescription && data.jobDescription.trim()) {
    doc.setFont("helvetica", "bold");
    doc.text("Target Role:", margin, yPos);
    doc.setFont("helvetica", "normal");
    const jobTitle = data.jobDescription.slice(0, 100) + (data.jobDescription.length > 100 ? "..." : "");
    yPos = addWrappedText(doc, jobTitle, margin + 30, yPos, contentWidth - 30, 6);
    yPos += 3;
  }
  
  doc.setFont("helvetica", "bold");
  doc.text("Analysis Date:", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(analysisDate, margin + 35, yPos);
  yPos += 12;
  
  const atsScore = data.atsScore ?? data.analysis?.ats_score ?? 0;
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, contentWidth, 35, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text("Overall ATS Score", pageWidth / 2, yPos + 10, { align: "center" });
  doc.setFontSize(32);
  doc.setTextColor(0, 0, 0);
  doc.text(`${atsScore}/100`, pageWidth / 2, yPos + 28, { align: "center" });
  yPos += 45;
  
  const breakdown = data.atsBreakdown || data.analysis?.score_breakdown;
  if (breakdown && typeof breakdown === "object") {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Score Breakdown", margin, yPos);
    yPos += 8;
    const breakdownData = Object.entries(breakdown).map(([key, value]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      return [label, `${value}/100`];
    });
    autoTable(doc, {
      startY: yPos,
      head: [["Category", "Score"]],
      body: breakdownData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;
  }
  
  const summary = data.atsSummary || data.analysis?.summary;
  if (summary && summary.trim()) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos = addWrappedText(doc, summary, margin, yPos, contentWidth, 6);
    yPos += 10;
  }
  
  const strengths = data.analysis?.strengths;
  if (strengths && Array.isArray(strengths) && strengths.length > 0) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Strengths", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    for (const strength of strengths) {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      const bulletPoint = `• ${strength}`;
      yPos = addWrappedText(doc, bulletPoint, margin + 3, yPos, contentWidth - 3, 6);
      yPos += 2;
    }
    yPos += 8;
  }
  
  const weaknesses = data.analysis?.weaknesses;
  if (weaknesses && Array.isArray(weaknesses) && weaknesses.length > 0) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Areas for Improvement", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    for (const weakness of weaknesses) {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      const bulletPoint = `• ${weakness}`;
      yPos = addWrappedText(doc, bulletPoint, margin + 3, yPos, contentWidth - 3, 6);
      yPos += 2;
    }
    yPos += 8;
  }
  
  const hiddenSkills = data.analysis?.hidden_skills;
  const matchingSkills = data.result?.skills_matching;
  const missingSkills = data.result?.skills_missing || data.skillGap?.missing_skills;
  if ((hiddenSkills && hiddenSkills.length > 0) || (matchingSkills && matchingSkills.length > 0) || (missingSkills && missingSkills.length > 0)) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Skills Analysis", margin, yPos);
    yPos += 10;
    if (hiddenSkills && hiddenSkills.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detected Skills:", margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const skillsText = hiddenSkills.join(", ");
      yPos = addWrappedText(doc, skillsText, margin + 3, yPos, contentWidth - 3, 5);
      yPos += 8;
    }
    if (matchingSkills && matchingSkills.length > 0) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Matching Skills:", margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const skillsText = matchingSkills.join(", ");
      yPos = addWrappedText(doc, skillsText, margin + 3, yPos, contentWidth - 3, 5);
      yPos += 8;
    }
    if (missingSkills && missingSkills.length > 0) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Missing Skills / Skill Gaps:", margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const skillsText = Array.isArray(missingSkills) ? missingSkills.join(", ") : missingSkills;
      yPos = addWrappedText(doc, skillsText, margin + 3, yPos, contentWidth - 3, 5);
      yPos += 8;
    }
  }
  
  if (data.result && data.jobDescription && data.jobDescription.trim()) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Job Match Analysis", margin, yPos);
    yPos += 10;
    if (typeof data.result.match_score === "number") {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Match Score: ${data.result.match_score}/100`, margin, yPos);
      yPos += 8;
    }
    if (data.result.fit_analysis && data.result.fit_analysis.trim()) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addWrappedText(doc, data.result.fit_analysis, margin, yPos, contentWidth, 6);
      yPos += 8;
    }
    if (data.result.strengths_for_role && data.result.strengths_for_role.length > 0) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Strengths for This Role:", margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const strength of data.result.strengths_for_role.slice(0, 5)) {
        if (yPos > pageHeight - 15) {
          doc.addPage();
          yPos = 20;
        }
        yPos = addWrappedText(doc, `• ${strength}`, margin + 3, yPos, contentWidth - 3, 5);
        yPos += 1;
      }
      yPos += 6;
    }
  }
  
  if (data.skillGapDetails && data.skillGapDetails.length > 0) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Skill Gap Analysis", margin, yPos);
    yPos += 10;
    for (const gap of data.skillGapDetails.slice(0, 5)) {
      if (yPos > pageHeight - 35) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`• ${gap.skill}`, margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (gap.why_required) {
        yPos = addWrappedText(doc, `Why: ${gap.why_required}`, margin + 5, yPos, contentWidth - 5, 5);
        yPos += 1;
      }
      if (gap.estimated_time) {
        doc.text(`Learning Time: ${gap.estimated_time}`, margin + 5, yPos);
        yPos += 5;
      }
      yPos += 3;
    }
    yPos += 5;
  }
  
  const keywords = data.analysis?.keyword_optimizer_suggestions;
  const improvements = data.result?.improvement_plan || data.skillGap?.improvement_plan;
  if ((keywords && keywords.length > 0) || (improvements && improvements.length > 0)) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations", margin, yPos);
    yPos += 10;
    if (keywords && keywords.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Keyword Optimization:", margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const keyword of keywords.slice(0, 5)) {
        if (yPos > pageHeight - 15) {
          doc.addPage();
          yPos = 20;
        }
        yPos = addWrappedText(doc, `• ${keyword}`, margin + 3, yPos, contentWidth - 3, 5);
        yPos += 1;
      }
      yPos += 8;
    }
    if (improvements && improvements.length > 0) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Next Steps:", margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const step of improvements.slice(0, 5)) {
        if (yPos > pageHeight - 15) {
          doc.addPage();
          yPos = 20;
        }
        yPos = addWrappedText(doc, `• ${step}`, margin + 3, yPos, contentWidth - 3, 5);
        yPos += 1;
      }
      yPos += 8;
    }
  }
  
  if (data.roadmap && typeof data.roadmap === "object") {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Career Roadmap", margin, yPos);
    yPos += 10;
    if (data.roadmap.target_role) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Target Role: `, margin, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(data.roadmap.target_role, margin + 28, yPos);
      yPos += 8;
    }
    if (data.roadmap.phases && Array.isArray(data.roadmap.phases)) {
      for (const phase of data.roadmap.phases.slice(0, 4)) {
        if (yPos > pageHeight - 35) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(phase.phase || phase.title, margin, yPos);
        yPos += 6;
        if (phase.duration) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.text(`Duration: ${phase.duration}`, margin + 3, yPos);
          yPos += 5;
        }
        doc.setFont("helvetica", "normal");
        if (phase.goals && phase.goals.length > 0) {
          for (const goal of phase.goals.slice(0, 3)) {
            if (yPos > pageHeight - 15) {
              doc.addPage();
              yPos = 20;
            }
            yPos = addWrappedText(doc, `  • ${goal}`, margin + 3, yPos, contentWidth - 3, 5);
            yPos += 1;
          }
        }
        yPos += 5;
      }
    }
    yPos += 5;
  }
  
  const interviewQuestions = data.interviewPrep?.questions || data.analysis?.interview_questions;
  if (interviewQuestions && Array.isArray(interviewQuestions) && interviewQuestions.length > 0) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Interview Preparation", margin, yPos);
    yPos += 10;
    for (const q of interviewQuestions.slice(0, 6)) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const questionText = `Q: ${q.question}`;
      yPos = addWrappedText(doc, questionText, margin, yPos, contentWidth, 5);
      yPos += 2;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      if (q.type) {
        doc.text(`Type: ${q.type}`, margin + 3, yPos);
        yPos += 5;
      }
      if (q.intent) {
        yPos = addWrappedText(doc, `Intent: ${q.intent}`, margin + 3, yPos, contentWidth - 3, 5);
        yPos += 2;
      }
      yPos += 5;
    }
  }
  
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  yPos = pageHeight - 35;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text(
    "This report was generated by CareerPilot AI based on the resume and job information provided.",
    pageWidth / 2,
    yPos,
    { align: "center", maxWidth: contentWidth }
  );
  yPos += 5;
  doc.text(
    "Recommendations are intended to support career decision-making and should be reviewed by the user.",
    pageWidth / 2,
    yPos,
    { align: "center", maxWidth: contentWidth }
  );
  
  addPageNumbers(doc);
  
  let filename = "CareerPilot_Resume_Analysis_Report";
  if (candidateName) {
    const namePart = candidateName.replace(/\s+/g, "_");
    filename = `CareerPilot_Resume_Analysis_Report_${namePart}`;
  } else if (data.filename) {
    const baseName = data.filename.replace(/\.[^.]+$/, "");
    filename = `CareerPilot_Resume_Analysis_Report_${baseName}`;
  }
  filename = sanitizeFilename(filename) + ".pdf";
  doc.save(filename);
}
