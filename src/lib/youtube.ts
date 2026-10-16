// YouTube Data API v3 Service
// Fetches real, working YouTube videos with metadata

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnail: string;
  viewCount: number;
  publishedAt: string;
  duration: string;
  language: string;
}

interface YouTubeCacheEntry {
  videos: YouTubeVideo[];
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const youtubeCache = new Map<string, YouTubeCacheEntry>();

// Language-specific search queries
const LANGUAGE_CONFIG = {
  English: '',
  Hindi: 'in hindi',
  Telugu: 'in telugu',
  Tamil: 'in tamil'
};

export async function fetchYouTubeVideos(
  topic: string,
  language: 'English' | 'Hindi' | 'Telugu' | 'Tamil' = 'English',
  apiKey?: string
): Promise<YouTubeVideo[]> {
  const cacheKey = `${topic}-${language}`;
  
  // Check cache
  const cached = youtubeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.videos;
  }

  if (!apiKey) {
    console.warn('YouTube API key not provided, returning empty results');
    return [];
  }

  try {
    const searchQuery = `${topic} tutorial ${LANGUAGE_CONFIG[language]}`.trim();
    
    // Step 1: Search for videos
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('q', searchQuery);
    searchUrl.searchParams.append('type', 'video');
    searchUrl.searchParams.append('maxResults', '12');
    searchUrl.searchParams.append('order', 'relevance');
    searchUrl.searchParams.append('videoDuration', 'long'); // Prefer long-form content
    searchUrl.searchParams.append('publishedAfter', getTwoYearsAgo());
    searchUrl.searchParams.append('key', apiKey);

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      throw new Error(`YouTube search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Step 2: Get video details (view count, duration)
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.append('part', 'contentDetails,statistics');
    detailsUrl.searchParams.append('id', videoIds);
    detailsUrl.searchParams.append('key', apiKey);

    const detailsResponse = await fetch(detailsUrl.toString());
    if (!detailsResponse.ok) {
      throw new Error(`YouTube details failed: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();
    
    // Create a map of videoId to details
    const detailsMap = new Map<string, { duration: string; viewCount: number }>(
      detailsData.items?.map((item: any) => [
        item.id,
        {
          duration: formatDuration(item.contentDetails?.duration || ''),
          viewCount: parseInt(item.statistics?.viewCount || '0') || 0
        }
      ]) || []
    );

    // Combine search results with details
    const videos: YouTubeVideo[] = searchData.items
      .map((item: any) => {
        const details = detailsMap.get(item.id.videoId);
        if (!details) return null;

        return {
          videoId: item.id.videoId,
          title: item.snippet?.title || '',
          channelName: item.snippet?.channelTitle || '',
          channelId: item.snippet?.channelId || '',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
          viewCount: details.viewCount,
          publishedAt: item.snippet?.publishedAt || '',
          duration: details.duration,
          language
        };
      })
      .filter((v: YouTubeVideo | null): v is YouTubeVideo => v !== null)
      .sort((a: YouTubeVideo, b: YouTubeVideo) => b.viewCount - a.viewCount) // Sort by views
      .slice(0, 5); // Return top 5 videos

    // Cache results
    youtubeCache.set(cacheKey, {
      videos,
      timestamp: Date.now()
    });

    return videos;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
}

function getTwoYearsAgo(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  return date.toISOString();
}

function formatDuration(isoDuration: string): string {
  // Convert PT1H2M3S to 1:02:03
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Clear cache (useful for testing or manual refresh)
export function clearYouTubeCache(): void {
  youtubeCache.clear();
}
