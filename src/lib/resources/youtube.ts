import { Resource } from '@/types/resource';

const youtubeCache = new Map<string, Resource[]>();

/**
 * Searches the official YouTube Data API v3 for educational tutorials on a topic.
 * Falls back gracefully when YOUTUBE_API_KEY is not configured.
 */
export async function searchYouTubeVideos(
  topicTitle: string,
  parentSkillId: string,
  subtopicId?: string
): Promise<Resource[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const cacheKey = `${parentSkillId}_${topicTitle}`;

  if (youtubeCache.has(cacheKey)) {
    return youtubeCache.get(cacheKey)!;
  }

  if (!apiKey) {
    return [];
  }

  try {
    const query = encodeURIComponent(`${topicTitle} tutorial complete course`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${query}&type=video&videoEmbeddable=true&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn('YouTube API call returned non-200 status:', res.status);
      return [];
    }

    const data = await res.json();
    const items = data.items || [];

    const resources: Resource[] = items.map((item: any, idx: number) => ({
      id: `yt_${item.id?.videoId || idx}`,
      subtopic_id: subtopicId || `sub_${parentSkillId}_yt`,
      parent_skill_id: parentSkillId,
      title: item.snippet?.title || `${topicTitle} Video Tutorial`,
      provider: 'youtube',
      type: 'video',
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      duration_minutes: 20,
      quality_score: 4.8,
      upvotes: 10 + Math.floor(Math.random() * 20),
      description: item.snippet?.description,
      author_or_channel: item.snippet?.channelTitle,
    }));

    youtubeCache.set(cacheKey, resources);
    return resources;
  } catch (err) {
    console.warn('Error fetching YouTube resources:', err);
    return [];
  }
}
