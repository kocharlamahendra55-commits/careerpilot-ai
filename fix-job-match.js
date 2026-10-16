const fs = require('fs');

// Read the current file
const content = fs.readFileSync('src/app/dashboard/job-match/page.tsx', 'utf8');

// Fix 1: Reduce loading animation delay from 300ms to 50ms
let fixed = content.replace(
  /await new Promise\(resolve => setTimeout\(resolve, 300\)\); \/\/ Reduced from 600-900ms to 300ms/,
  'await new Promise(resolve => setTimeout(resolve, 50)); // Minimal delay for UX'
);

// Fix 2: Change error throwing to setting error state (prevent React error boundary)
fixed = fixed.replace(
  /if \(!hasData\) \{\s+\/\/ All APIs failed - provide specific error message\s+const errorDetails = failedApis\.length === 3[^}]+\}\s+throw new Error\(errorDetails\);/s,
  `if (!hasData) {
        // All APIs failed - set error state without throwing
        const errorDetails = failedApis.length === 3 
          ? "All analysis services are currently unavailable. This may be due to:\\n\\n" +
            "? AI service rate limit (if analyzing many resumes quickly)\\n" +
            "? Network connectivity issues\\n" +
            "? Temporary service outage\\n\\n" +
            "Please wait 2-3 minutes and try again. If the issue persists, contact support."
          : \`\${failedApis.join(", ")} \${failedApis.length === 1 ? "service is" : "services are"} currently unavailable.\`;
        
        console.error("[JobMatch] Analysis failed:", errorDetails);
        setError(errorDetails);
        setLoading(false);
        return; // Don't throw - prevents React error boundary
      }`
);

fs.writeFileSync('src/app/dashboard/job-match/page.tsx', fixed, 'utf8');
console.log('? Fixed src/app/dashboard/job-match/page.tsx');
