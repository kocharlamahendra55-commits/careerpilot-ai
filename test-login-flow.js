const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Simple HTTP client to handle cookies
async function makeRequest(method, url, data, cookies = []) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;
    const urlParts = new URL(url);
    
    const options = {
      hostname: urlParts.hostname,
      port: urlParts.port || (isHttps ? 443 : 80),
      path: urlParts.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Client'
      }
    };
    
    // Add cookies if provided
    if (cookies.length > 0) {
      options.headers['Cookie'] = cookies.join('; ');
    }
    
    if (data && method !== 'GET') {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Extract cookies from response
        const setCookies = res.headers['set-cookie'] || [];
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookies: setCookies,
          body: body ? JSON.parse(body) : null
        });
      });
    });
    
    req.on('error', reject);
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testLoginFlow() {
  console.log("🧪 Testing complete login flow...\n");
  
  try {
    // Step 1: Login
    console.log("Step 1: Sending login request");
    const loginResponse = await makeRequest('POST', 'http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    
    console.log("Login Response Status:", loginResponse.statusCode);
    console.log("Login Response Body:", loginResponse.body);
    console.log("Login Response Set-Cookie:", loginResponse.cookies);
    
    if (loginResponse.statusCode !== 200) {
      console.log("❌ Login failed!");
      return;
    }
    
    // Extract session cookie
    const sessionCookie = loginResponse.cookies.find(cookie => cookie.startsWith('session='));
    if (!sessionCookie) {
      console.log("❌ No session cookie found in login response!");
      return;
    }
    
    console.log("✅ Session cookie extracted:", sessionCookie.substring(0, 50) + "...\n");
    
    // Step 2: Test /me endpoint with cookie
    console.log("Step 2: Testing /me endpoint with session cookie");
    const meResponse = await makeRequest('GET', 'http://localhost:3000/api/auth/me', null, [sessionCookie]);
    
    console.log("Me Response Status:", meResponse.statusCode);
    console.log("Me Response Body:", meResponse.body);
    
    if (meResponse.statusCode === 200) {
      console.log("✅ /me endpoint works with session cookie!");
    } else {
      console.log("❌ /me endpoint failed with session cookie");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testLoginFlow();