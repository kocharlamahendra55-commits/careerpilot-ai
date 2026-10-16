const fs = require('fs');

// Read the current file
const content = fs.readFileSync('src/app/api/interview/route.ts', 'utf8');

// Fix type annotations
let fixed = content.replace(
  'function buildInterviewUserPrompt(resumeText, jobDescription) {',
  'function buildInterviewUserPrompt(resumeText: string, jobDescription: string): string {'
);

fixed = fixed.replace(
  'export async function POST(req) {',
  'export async function POST(req: NextRequest) {'
);

fixed = fixed.replace(
  '    let interviewPrep;',
  '    let interviewPrep: Record<string, unknown>;'
);

fixed = fixed.replace(
  '        interviewPrep = parseAIJson(raw);',
  '        interviewPrep = parseAIJson<Record<string, unknown>>(raw);'
);

fixed = fixed.replace(
  '    // ?? Normalize schema: fill missing fields so UI never crashes ???????????\n    const ip = interviewPrep;',
  '    // ?? Normalize schema: fill missing fields so UI never crashes ???????????\n    const ip = interviewPrep as any;'
);

fixed = fixed.replace(
  '      ? ip.questions.map((q) => ({',
  '      ? ip.questions.map((q: any) => ({'
);

fs.writeFileSync('src/app/api/interview/route.ts', fixed, 'utf8');
console.log('? Fixed TypeScript types in interview route');
