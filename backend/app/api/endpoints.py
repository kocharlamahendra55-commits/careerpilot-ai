from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.parser import ResumeParser
from app.services.gemini import GeminiService

router = APIRouter()
gemini_service = GeminiService()

class AnalyzeTextRequest(BaseModel):
    text: str

class MatchJobRequest(BaseModel):
    resume_text: str
    job_description: str

class RoadmapRequest(BaseModel):
    resume_text: str
    target_role: str

class InterviewPrepRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = ""

@router.post("/parse")
async def parse_resume_file(file: UploadFile = File(...)):
    """Extract raw text from PDF/DOCX files."""
    contents = await file.read()
    text = ResumeParser.parse_file(contents, file.filename)
    return {"text": text, "filename": file.filename}

@router.post("/analyze-file")
async def analyze_resume_file(file: UploadFile = File(...)):
    """Upload a file, parse it, and perform full ATS analysis in one step."""
    contents = await file.read()
    text = ResumeParser.parse_file(contents, file.filename)
    analysis = gemini_service.analyze_resume(text)
    return {
        "filename": file.filename,
        "resume_text": text,
        "analysis": analysis
    }

@router.post("/analyze-text")
async def analyze_resume_text(payload: AnalyzeTextRequest):
    """Analyze pre-parsed resume text."""
    analysis = gemini_service.analyze_resume(payload.text)
    return {"analysis": analysis}

@router.post("/match-job")
async def match_job_description(payload: MatchJobRequest):
    """Match resume text against a job description."""
    match_result = gemini_service.match_job(payload.resume_text, payload.job_description)
    return {"match": match_result}

@router.post("/generate-roadmap")
async def generate_career_roadmap(payload: RoadmapRequest):
    """Generate career transition roadmap steps to a target role."""
    roadmap = gemini_service.generate_roadmap(payload.resume_text, payload.target_role)
    return {"roadmap": roadmap}

@router.post("/interview-prep")
async def generate_interview_prep(payload: InterviewPrepRequest):
    """Generate mock interview preparation Q&A."""
    prep = gemini_service.generate_interview_prep(payload.resume_text, payload.job_description)
    return {"interview_prep": prep}

@router.post("/skill-gap")
async def analyze_skill_gap(payload: RoadmapRequest):
    """Analyze skill gaps and suggest courses/learning resources."""
    gap_result = gemini_service.analyze_skill_gap(payload.resume_text, payload.target_role)
    return {"skill_gap": gap_result}
