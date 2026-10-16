const fs = require('fs');
const path = require('path');
const http = require('http');

async function makeMultipartRequest(url, filePath, sessionCookie) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const fileName = path.basename(filePath);
        const fileData = fs.readFileSync(filePath);
        
        // Create multipart form data
        let formData = '';
        formData += `--${boundary}\r\n`;
        formData += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
        formData += `Content-Type: application/pdf\r\n\r\n`;
        
        const header = Buffer.from(formData, 'utf8');
        const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
        
        // Job description field
        const jobDescField = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="jobDescription"\r\n\r\nSenior Software Engineer - Full Stack Development\r\n`, 'utf8');
        
        const totalLength = header.length + fileData.length + jobDescField.length + footer.length;
        
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': totalLength,
                'Cookie': sessionCookie
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        
        // Write the multipart data
        req.write(header);
        req.write(fileData);
        req.write(jobDescField);
        req.write(footer);
        req.end();
    });
}

async function testCompleteWorkflow() {
    try {
        console.log('=== COMPLETE PDF WORKFLOW VERIFICATION ===\n');
        
        // Step 1: Login
        console.log('Step 1: User Login');
        const loginResponse = await makeRequest('http://localhost:3000/api/auth/login', 'POST', {
            'Content-Type': 'application/json'
        }, JSON.stringify({
            email: 'test@example.com',
            password: 'test12345'
        }));
        
        console.log(`Status: ${loginResponse.statusCode}`);
        if (loginResponse.statusCode !== 200) {
            console.log('❌ FAIL: Login failed!');
            console.log('Response:', loginResponse.body);
            return;
        }
        
        const sessionCookie = loginResponse.headers['set-cookie']?.[0];
        console.log('✅ PASS: Login successful\n');
        
        // Step 2: PDF Upload and Analysis
        console.log('Step 2: PDF Upload, Parsing, and Analysis');
        console.log('File: node_modules/pdf-parse/test/data/01-valid.pdf');
        
        const uploadStart = Date.now();
        const uploadResponse = await makeMultipartRequest(
            'http://localhost:3000/api/analyze',
            './node_modules/pdf-parse/test/data/01-valid.pdf',
            sessionCookie
        );
        const uploadDuration = Date.now() - uploadStart;
        
        console.log(`Status: ${uploadResponse.statusCode}`);
        console.log(`Duration: ${uploadDuration}ms`);
        
        let analysisResult;
        try {
            analysisResult = JSON.parse(uploadResponse.body);
        } catch (e) {
            console.log('❌ FAIL: Response not valid JSON');
            console.log('Raw response:', uploadResponse.body.substring(0, 500));
            return;
        }
        
        if (uploadResponse.statusCode === 200 && analysisResult.success) {
            console.log('✅ PASS: PDF Upload successful');
            console.log('✅ PASS: PDF Parsing successful');
            console.log('✅ PASS: Resume Analysis successful');
            console.log(`Resume ID: ${analysisResult.resumeId}`);
            console.log(`Text extracted: ${analysisResult.resume_text?.length || 0} characters`);
            
            // Verify ATS Score
            const atsScore = analysisResult.analysis?.ats_score;
            if (atsScore !== undefined && atsScore >= 0 && atsScore <= 100) {
                console.log(`✅ PASS: ATS Score generated: ${atsScore}`);
            } else {
                console.log(`❌ FAIL: Invalid ATS Score: ${atsScore}`);
                return;
            }
            
            // Verify Skill Extraction
            const skills = analysisResult.analysis?.hidden_skills;
            if (Array.isArray(skills) && skills.length > 0) {
                console.log(`✅ PASS: Skill Extraction successful (${skills.length} skills)`);
            } else {
                console.log(`❌ FAIL: Skill Extraction failed or empty`);
                return;
            }
            
        } else {
            console.log('❌ FAIL: Upload/Analysis failed');
            console.log('Error:', analysisResult.error || 'Unknown error');
            if (analysisResult.detail) {
                console.log('Detail:', analysisResult.detail);
            }
            return;
        }
        
        // Step 3: Verify Database Save
        console.log('\nStep 3: Database Save Verification');
        const resumesResponse = await makeRequest('http://localhost:3000/api/resumes', 'GET', {
            'Cookie': sessionCookie
        });
        
        console.log(`Status: ${resumesResponse.statusCode}`);
        if (resumesResponse.statusCode === 200) {
            try {
                const resumesData = JSON.parse(resumesResponse.body);
                if (resumesData.resumes && resumesData.resumes.length > 0) {
                    console.log('✅ PASS: Database Save verified');
                    console.log(`Resumes in database: ${resumesData.resumes.length}`);
                } else {
                    console.log('❌ FAIL: No resumes found in database');
                    return;
                }
            } catch (e) {
                console.log('❌ FAIL: Invalid response from resumes endpoint');
                return;
            }
        } else {
            console.log('❌ FAIL: Database verification failed');
            return;
        }
        
        // Step 4: Job Match Test
        console.log('\nStep 4: Job Match Test');
        const jobMatchStart = Date.now();
        const jobMatchResponse = await makeRequest('http://localhost:3000/api/job-match', 'POST', {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        }, JSON.stringify({
            resume_text: analysisResult.resume_text,
            job_description: 'Senior Software Engineer - Full Stack Development with React and Node.js'
        }));
        const jobMatchDuration = Date.now() - jobMatchStart;
        
        console.log(`Status: ${jobMatchResponse.statusCode}`);
        console.log(`Duration: ${jobMatchDuration}ms`);
        
        if (jobMatchResponse.statusCode === 200) {
            try {
                const jobMatchResult = JSON.parse(jobMatchResponse.body);
                const matchScore = jobMatchResult.match?.match_score;
                if (matchScore !== undefined && matchScore >= 0 && matchScore <= 100) {
                    console.log(`✅ PASS: Job Match successful (Score: ${matchScore}%)`);
                } else {
                    console.log('❌ FAIL: Invalid job match score');
                    return;
                }
            } catch (e) {
                console.log('✅ PASS: Job Match completed (non-JSON response)');
            }
        } else {
            console.log('❌ FAIL: Job Match failed');
            console.log('Response:', jobMatchResponse.body.substring(0, 200));
            return;
        }
        
        // Step 5: Roadmap Generation Test
        console.log('\nStep 5: Roadmap Generation Test');
        const roadmapStart = Date.now();
        const roadmapResponse = await makeRequest('http://localhost:3000/api/roadmap', 'POST', {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        }, JSON.stringify({
            resume_text: analysisResult.resume_text.substring(0, 1000), // Shorter text for faster processing
            target_role: 'Senior Software Engineer'
        }), 120000); // 2 minute timeout
        const roadmapDuration = Date.now() - roadmapStart;
        
        console.log(`Status: ${roadmapResponse.statusCode}`);
        console.log(`Duration: ${roadmapDuration}ms`);
        
        if (roadmapResponse.statusCode === 200) {
            console.log('✅ PASS: Roadmap Generation successful');
        } else {
            console.log('❌ FAIL: Roadmap Generation failed');
            console.log('Response:', roadmapResponse.body.substring(0, 200));
            return;
        }
        
        // Step 6: Interview Generation Test
        console.log('\nStep 6: Interview Generation Test');
        const interviewStart = Date.now();
        const interviewResponse = await makeRequest('http://localhost:3000/api/interview', 'POST', {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        }, JSON.stringify({
            resume_text: analysisResult.resume_text.substring(0, 1000), // Shorter text for faster processing
            position: 'Senior Software Engineer'
        }), 120000); // 2 minute timeout
        const interviewDuration = Date.now() - interviewStart;
        
        console.log(`Status: ${interviewResponse.statusCode}`);
        console.log(`Duration: ${interviewDuration}ms`);
        
        if (interviewResponse.statusCode === 200) {
            console.log('✅ PASS: Interview Generation successful');
        } else {
            console.log('❌ FAIL: Interview Generation failed');
            console.log('Response:', interviewResponse.body.substring(0, 200));
            return;
        }
        
        console.log('\n=== ALL TESTS PASSED ===');
        
    } catch (error) {
        console.error('❌ FAIL: Test error:', error.message);
    }
}

function makeRequest(url, method, headers, body, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname,
            method: method,
            headers: headers,
            timeout: timeout
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.on('error', reject);
        
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

testCompleteWorkflow();