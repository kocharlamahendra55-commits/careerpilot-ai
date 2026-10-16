const fs = require('fs');
const pdfParse = require('pdf-parse');

async function main() {
  console.log('pdf-parse version:', require('./node_modules/pdf-parse/package.json').version);
  console.log('pdf-parse type:', typeof pdfParse);
  
  // Create test text resume
  const textContent = `John Doe
Software Engineer
Email: john@example.com | Phone: 555-1234

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years building scalable web applications.

EXPERIENCE
Senior Software Engineer - Tech Corp (2020-Present)
- Developed microservices architecture serving 1M+ users
- Reduced API response time by 60% through caching optimization
- Led team of 4 engineers on product feature delivery

Junior Developer - StartupXYZ (2018-2020)
- Built React frontend components and REST APIs with Node.js
- Maintained PostgreSQL databases and wrote complex SQL queries

SKILLS
Languages: JavaScript, TypeScript, Python, SQL
Frameworks: React, Next.js, Node.js, Express
Databases: PostgreSQL, MongoDB, Redis
Tools: Git, Docker, AWS, CI/CD pipelines

EDUCATION
Bachelor of Science in Computer Science
State University (2018) - GPA: 3.7/4.0
`;
  
  fs.writeFileSync('test_resume.txt', textContent);
  console.log('\nTest TXT created. Length:', textContent.length);
  console.log('Preview:', textContent.slice(0, 100));
  
  // Try to find any PDF in the project for testing
  const potentialPdfs = ['test.pdf', 'sample.pdf', 'resume.pdf'];
  for (const p of potentialPdfs) {
    if (fs.existsSync(p)) {
      console.log('\nFound PDF:', p, '- testing...');
      const buf = fs.readFileSync(p);
      try {
        const data = await pdfParse(buf);
        console.log('Extracted text length:', data.text.length);
        console.log('First 300 chars:', data.text.slice(0, 300));
      } catch (e) {
        console.log('PDF parse error:', e.message);
      }
    }
  }
  
  console.log('\nAll checks complete. Run the dev server and upload test_resume.txt to verify the API.');
  console.log('Server should be at: http://localhost:3000');
}

main().catch(console.error);
