import type { JobPlatform } from "@/types";

// ─── Job Platform Categorization ───────────────────────────────────────────
// Groups AI-generated job_platforms into buckets for display purposes only.
// Purely heuristic/keyword based — no static list of platforms is rendered,
// this only classifies whatever platforms are actually returned at runtime.

export interface JobPlatformCategory {
  key: string;
  label: string;
  icon: string;
  subtitle: string;
  platforms: JobPlatform[];
}

type CategoryDefinition = {
  key: string;
  label: string;
  icon: string;
  subtitle: string;
  keywords: string[];
};

// Order matters: first matching category wins. More specific categories
// (India, Startup, Remote) are checked before the broad "Global" bucket
// so e.g. "AngelList" isn't miscategorized as global just because it's
// also a well known job site.
const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: "india",
    label: "India Jobs",
    icon: "🇮🇳",
    subtitle: "Regional Opportunities",
    keywords: [
      "naukri",
      "foundit",
      "monster india",
      "internshala",
      "shine",
      "cutshort",
      "timesjobs",
      "iimjobs",
      "hirist",
      "instahyre",
      "freshersworld",
      "quikr jobs",
    ],
  },
  {
    key: "startup",
    label: "Startup Jobs",
    icon: "🚀",
    subtitle: "Startup Ecosystem",
    keywords: [
      "wellfound",
      "angellist",
      "angel list",
      "y combinator",
      "ycombinator",
      "workatastartup",
      "work at a startup",
      "startup.jobs",
      "startupjobs",
    ],
  },
  {
    key: "remote",
    label: "Remote Jobs",
    icon: "🌐",
    subtitle: "Work From Anywhere",
    keywords: [
      "remote ok",
      "remoteok",
      "we work remotely",
      "weworkremotely",
      "flexjobs",
      "remote.co",
      "remoteco",
      "justremote",
      "remotive",
      "working nomads",
    ],
  },
  {
    key: "global",
    label: "Global Jobs",
    icon: "🌍",
    subtitle: "International Opportunities",
    keywords: [
      "linkedin",
      "indeed",
      "glassdoor",
      "monster",
      "ziprecruiter",
      "careerbuilder",
      "simplyhired",
      "google jobs",
    ],
  },
];

const OTHER_CATEGORY: JobPlatformCategory = {
  key: "other",
  label: "Other Platforms",
  icon: "📌",
  subtitle: "Additional Platforms",
  platforms: [],
};

/**
 * Categorizes a list of JobPlatform entries into labeled groups based on
 * case-insensitive substring matching against the platform's name, and
 * falling back to description/url when the name doesn't match anything.
 *
 * Returns an ordered array of non-empty groups. Anything that doesn't match
 * a known keyword set is placed into "Other Platforms".
 */
export function categorizeJobPlatforms(platforms: JobPlatform[] | undefined | null): JobPlatformCategory[] {
  const groups: Record<string, JobPlatformCategory> = {};
  for (const def of CATEGORY_DEFINITIONS) {
    groups[def.key] = { key: def.key, label: def.label, icon: def.icon, subtitle: def.subtitle, platforms: [] };
  }
  groups[OTHER_CATEGORY.key] = { ...OTHER_CATEGORY, platforms: [] };

  for (const platform of platforms ?? []) {
    if (!platform) continue;
    const name = (platform.name ?? "").toLowerCase();
    const description = (platform.description ?? "").toLowerCase();
    const url = (platform.url ?? "").toLowerCase();

    const matchedDef = CATEGORY_DEFINITIONS.find((def) =>
      def.keywords.some((kw) => name.includes(kw))
    ) ?? CATEGORY_DEFINITIONS.find((def) =>
      def.keywords.some((kw) => description.includes(kw) || url.includes(kw))
    );

    const targetKey = matchedDef?.key ?? OTHER_CATEGORY.key;
    groups[targetKey].platforms.push(platform);
  }

  const orderedKeys = [...CATEGORY_DEFINITIONS.map((d) => d.key), OTHER_CATEGORY.key];
  return orderedKeys
    .map((key) => groups[key])
    .filter((group) => group.platforms.length > 0);
}
