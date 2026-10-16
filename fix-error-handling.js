const fs = require('fs');

// Read the current file
let content = fs.readFileSync('src/app/dashboard/job-match/page.tsx', 'utf8');

// Replace the throw with setError + setLoading + return
const errorThrowPattern = /if \(!hasData\) \{\s*\/\/ All APIs failed - provide specific error message\s*const errorDetails = failedApis\.length === 3[^;]+;\s*throw new Error\(errorDetails\);/s;

const replacement = `if (!hasData) {
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
      }`;

content = content.replace(errorThrowPattern, replacement);

fs.writeFileSync('src/app/dashboard/job-match/page.tsx', content, 'utf8');
console.log('? Fixed error handling in Job Match page');
