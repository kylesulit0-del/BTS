/**
 * Moderation pipeline prompt templates and relevance criteria.
 *
 * Config-driven: the prompt template is editable without code changes.
 * Group-specific data (member names, aliases) is defined here so the
 * LLM prompt is automatically built from config data.
 */

export interface RelevanceCriteria {
  groupName: string;
  memberNames: string[];       // Stage names
  realNames: string[];
  aliases: string[];
  adjacentTopics: string[];    // e.g., ['HYBE', 'BigHit']
}

export const MODERATION_PROMPT_TEMPLATE = `
You are a content moderator for a {{groupName}} fan feed app.

## Group Members
{{memberList}}

## Relevance Criteria
Content is RELEVANT if it is primarily about:
- {{groupName}} as a group
- Any individual member (solo activities, collaborations, personal updates)
- {{adjacentTopics}} when directly related to {{groupName}} members
- Merch, album releases, concert tickets, award shows involving {{groupName}}

Content is NOT RELEVANT if:
- {{groupName}} or members are only mentioned in passing
- It is about other K-pop groups without {{groupName}} involvement
- When uncertain, mark as NOT relevant

## Safety Criteria
Content is UNSAFE if it contains:
- Explicit sexual content or graphic violence
- Hate speech or harassment targeting individuals
- Dangerous misinformation about real people
- Spam or purely commercial content unrelated to fandom

## Content Types
Classify each item into exactly ONE type:
- news: Official announcements, industry news, interviews
- fan_art: Fan-created artwork, edits, graphics
- meme: Humor, jokes, meme formats
- video: Video content, MVs, performances, vlogs
- discussion: Opinions, analyses, forum discussions, questions
- translation: Translated content from Korean/Japanese/etc.
- official: Direct posts from {{groupName}} members or official accounts

## Task
For each content item below, determine:
1. Is it relevant? (true/false)
2. Is it safe? (true/false)
3. What content type is it?

Assess content in any language equally (Korean, Japanese, English, etc.).
`;

export const BTS_RELEVANCE_CRITERIA: RelevanceCriteria = {
  groupName: 'BTS',
  memberNames: ['RM', 'Jin', 'SUGA', 'j-hope', 'Jimin', 'V', 'Jungkook'],
  realNames: [
    'Kim Namjoon', 'Kim Seokjin', 'Min Yoongi',
    'Jung Hoseok', 'Park Jimin', 'Kim Taehyung', 'Jeon Jungkook',
  ],
  aliases: [
    'Bangtan', 'Bangtan Sonyeondan', 'ARMY', 'Agust D',
    'Hobi', 'JK', 'Kookie', 'ChimChim', 'Taetae', 'Rapmon',
    'Namjoon', 'Seokjin', 'Yoongi', 'Hoseok', 'Taehyung', 'Jungkook',
  ],
  adjacentTopics: ['HYBE', 'BigHit', 'BIGHIT MUSIC', 'Weverse'],
};
