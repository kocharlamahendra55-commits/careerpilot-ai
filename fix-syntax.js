const fs = require('fs');

// Read the current file
let content = fs.readFileSync('src/app/dashboard/job-match/page.tsx', 'utf8');

// Remove the duplicate closing brace
content = content.replace(
  /return; \/\/ Don't throw - prevents React error boundary\s+\}\s+\}/,
  'return; // Don\'t throw - prevents React error boundary\n      }'
);

fs.writeFileSync('src/app/dashboard/job-match/page.tsx', content, 'utf8');
console.log('? Fixed syntax error in Job Match page');
