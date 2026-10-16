#!/usr/bin/env python3
import os

def create_simple_pdf():
    """Create a simple, compatible PDF using reportlab with proper structure"""
    try:
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        
        # Create document
        filename = "john_smith_professional_resume.pdf"
        doc = SimpleDocTemplate(filename, pagesize=letter, 
                              leftMargin=inch, rightMargin=inch,
                              topMargin=inch, bottomMargin=inch)
        
        # Get styles
        styles = getSampleStyleSheet()
        
        # Content
        story = []
        
        # Header
        story.append(Paragraph("<b>JOHN SMITH</b>", styles['Title']))
        story.append(Paragraph("Senior Software Engineer", styles['Heading2']))
        story.append(Paragraph("john.smith@email.com | (555) 123-4567 | LinkedIn: linkedin.com/in/johnsmith", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Professional Summary
        story.append(Paragraph("<b>PROFESSIONAL SUMMARY</b>", styles['Heading2']))
        story.append(Paragraph("Experienced Senior Software Engineer with 8+ years of expertise in full-stack web development, cloud architecture, and team leadership. Proven track record of delivering scalable applications using React, Node.js, and AWS services. Led cross-functional teams and mentored junior developers while driving technical excellence.", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Technical Skills
        story.append(Paragraph("<b>TECHNICAL SKILLS</b>", styles['Heading2']))
        story.append(Paragraph("<b>Frontend:</b> React, TypeScript, JavaScript, HTML5, CSS3, Redux, Next.js, Angular", styles['Normal']))
        story.append(Paragraph("<b>Backend:</b> Node.js, Python, Express.js, RESTful APIs, GraphQL, Microservices", styles['Normal']))
        story.append(Paragraph("<b>Database:</b> PostgreSQL, MongoDB, Redis, MySQL, Prisma ORM", styles['Normal']))
        story.append(Paragraph("<b>Cloud & DevOps:</b> AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, CI/CD, Jenkins", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Experience
        story.append(Paragraph("<b>PROFESSIONAL EXPERIENCE</b>", styles['Heading2']))
        
        story.append(Paragraph("<b>Senior Software Engineer</b> - TechCorp Solutions", styles['Heading3']))
        story.append(Paragraph("<i>January 2020 - Present</i>", styles['Normal']))
        story.append(Paragraph("• Led development of enterprise SaaS platform serving 50,000+ users with 99.9% uptime", styles['Normal']))
        story.append(Paragraph("• Architected and implemented microservices architecture reducing system latency by 40%", styles['Normal']))
        story.append(Paragraph("• Mentored team of 5 junior developers and conducted code reviews", styles['Normal']))
        story.append(Paragraph("• Implemented automated testing strategies increasing code coverage from 60% to 95%", styles['Normal']))
        story.append(Spacer(1, 8))
        
        story.append(Paragraph("<b>Full Stack Developer</b> - StartupXYZ", styles['Heading3']))
        story.append(Paragraph("<i>March 2018 - December 2019</i>", styles['Normal']))
        story.append(Paragraph("• Built responsive web applications using React and Node.js for fintech startup", styles['Normal']))
        story.append(Paragraph("• Designed and implemented RESTful APIs handling 1M+ requests per day", styles['Normal']))
        story.append(Paragraph("• Optimized database queries reducing response time by 60%", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Education
        story.append(Paragraph("<b>EDUCATION</b>", styles['Heading2']))
        story.append(Paragraph("<b>Bachelor of Science in Computer Science</b>", styles['Normal']))
        story.append(Paragraph("University of Technology | Graduated: May 2016 | GPA: 3.8/4.0", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Certifications
        story.append(Paragraph("<b>CERTIFICATIONS</b>", styles['Heading2']))
        story.append(Paragraph("• AWS Certified Solutions Architect - Associate (2022)", styles['Normal']))
        story.append(Paragraph("• Certified Kubernetes Administrator (CKA) (2021)", styles['Normal']))
        story.append(Paragraph("• Google Cloud Professional Developer (2020)", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        print(f"Professional PDF created: {filename}")
        return filename
        
    except Exception as e:
        print(f"Error creating PDF: {e}")
        return None

if __name__ == "__main__":
    create_simple_pdf()