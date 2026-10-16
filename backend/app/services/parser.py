import io
import pdfplumber
import docx
from fastapi import HTTPException

class ResumeParser:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        text = ""
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            # Fallback if pdfplumber fails to extract text (e.g. scanned image pdfs)
            if not text.strip():
                # In a full production setup we'd use Tesseract OCR here, 
                # but for standard text PDFs we will report a parsing error or attempt standard extraction.
                pass
                
            return text.strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF file: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> str:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            text = []
            for paragraph in doc.paragraphs:
                text.append(paragraph.text)
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text.append(cell.text)
            return "\n".join(text).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse DOCX file: {str(e)}")

    @classmethod
    def parse_file(cls, file_bytes: bytes, filename: str) -> str:
        ext = filename.split(".")[-1].lower()
        if ext == "pdf":
            text = cls.extract_text_from_pdf(file_bytes)
        elif ext in ["docx", "doc"]:
            text = cls.extract_text_from_docx(file_bytes)
        elif ext == "txt":
            text = file_bytes.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: .{ext}")
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="The uploaded file appears to be empty or unreadable.")
            
        return text
