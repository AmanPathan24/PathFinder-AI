import { Resource } from '@/types/resource';
import rawCuratedResources from '@/data/curated-resources.json';
import { searchYouTubeVideos } from './youtube';

const curatedCatalog: Resource[] = rawCuratedResources as Resource[];

export async function fetchResourcesForSkill(
  parentSkillId: string,
  topicTitle?: string
): Promise<Resource[]> {
  // 1. Get curated resources
  const curated = curatedCatalog.filter((r) => r.parent_skill_id === parentSkillId);

  // 2. Fetch live YouTube Data API resources if available
  let youtubeResults: Resource[] = [];
  if (topicTitle) {
    youtubeResults = await searchYouTubeVideos(topicTitle, parentSkillId);
  }

  const combined = [...curated, ...youtubeResults];

  // If no specific resources found, generate standard official + article + video fallback
  if (combined.length === 0 && topicTitle) {
    return [
      {
        id: `res_${parentSkillId}_1`,
        subtopic_id: `sub_${parentSkillId}_1`,
        parent_skill_id: parentSkillId,
        title: `${topicTitle} — Official Documentation & Spec`,
        provider: 'curated',
        type: 'official',
        url: `https://www.google.com/search?q=${encodeURIComponent(topicTitle + ' official documentation')}`,
        duration_minutes: 30,
        quality_score: 4.9,
        upvotes: 24,
        author_or_channel: 'Official Docs',
      },
      {
        id: `res_${parentSkillId}_2`,
        subtopic_id: `sub_${parentSkillId}_2`,
        parent_skill_id: parentSkillId,
        title: `${topicTitle} (Visual Deep Dive Course)`,
        provider: 'youtube',
        type: 'video',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicTitle + ' course')}`,
        duration_minutes: 25,
        quality_score: 4.8,
        upvotes: 19,
        author_or_channel: 'Curated Video',
      },
      {
        id: `res_${parentSkillId}_3`,
        subtopic_id: `sub_${parentSkillId}_3`,
        parent_skill_id: parentSkillId,
        title: `Practical Guide & Production Patterns for ${topicTitle}`,
        provider: 'curated',
        type: 'article',
        url: `https://www.google.com/search?q=${encodeURIComponent(topicTitle + ' production best practices')}`,
        duration_minutes: 20,
        quality_score: 4.7,
        upvotes: 15,
        author_or_channel: 'Technical Guide',
      },
    ];
  }

  // Sort by computed quality_score and upvotes
  return combined.sort((a, b) => b.quality_score * 10 + b.upvotes - (a.quality_score * 10 + a.upvotes));
}
