const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test12345'
      })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login cookies:', cookies);
    
    // Upload resume
    const form = new FormData();
    form.append('file', fs.createReadStream('test-resume.txt'));
    form.append('jobDescription', 'Software Developer position');
    
    const uploadResponse = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      body: form
    });
    
    const result = await uploadResponse.json();
    console.log('Upload result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testUpload();