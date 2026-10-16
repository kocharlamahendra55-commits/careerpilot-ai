const fs = require('fs');

// Read the current file
const content = fs.readFileSync('src/app/api/analyze/route.ts', 'utf8');

// Fix: Reduce maxTokens from 3500 to 2800 and reduce prompt size
let fixed = content.replace(
  /{ temperature: 0\.3, maxTokens: 3500 }/,
  '{ temperature: 0.3, maxTokens: 2800 }'
);

// Also reduce resume text slice from 6000 to 4500 chars
fixed = fixed.replace(
  /resumeText\.slice\(0, 6000\)/,
  'resumeText.slice(0, 4500)'
);

// Reduce job description from 1500 to 1000 chars
fixed = fixed.replace(
  /jobDescription\.slice\(0, 1500\)/,
  'jobDescription.slice(0, 1000)'
);

fs.writeFileSync('src/app/api/analyze/route.ts', fixed, 'utf8');
console.log('? Optimized src/app/api/analyze/route.ts');
