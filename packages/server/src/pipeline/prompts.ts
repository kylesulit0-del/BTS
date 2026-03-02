/**
 * Prompt builder for the moderation pipeline.
 *
 * Takes the config-driven template from @bts/shared and substitutes
 * group-specific data (member names, aliases, adjacent topics) to
 * produce the final LLM prompt with content items appended.
 */

import {
  MODERATION_PROMPT_TEMPLATE,
  BTS_RELEVANCE_CRITERIA,
} from '@bts/shared/config/prompts.js';

const MAX_TITLE_LENGTH = 150;

export interface BatchItem {
  index: number;
  title: string;
  source: string;
}

/**
 * Builds a complete prompt for batched content classification.
 *
 * Replaces template variables with BTS member data and appends
 * the content items as a numbered list for the LLM to classify.
 */
export function buildBatchPrompt(items: BatchItem[]): string {
  const criteria = BTS_RELEVANCE_CRITERIA;

  // Build member list with stage names, real names, and aliases
  const memberList = criteria.memberNames
    .map((name: string, i: number) => `- ${name} (${criteria.realNames[i]})`)
    .join('\n');

  const aliasLine = criteria.aliases.join(', ');
  const memberSection = `${memberList}\n- Known aliases: ${aliasLine}`;

  // Build adjacent topics as comma-separated list
  const adjacentTopics = criteria.adjacentTopics.join(', ');

  // Substitute template variables
  let prompt = MODERATION_PROMPT_TEMPLATE
    .replace(/\{\{groupName\}\}/g, criteria.groupName)
    .replace(/\{\{memberList\}\}/g, memberSection)
    .replace(/\{\{adjacentTopics\}\}/g, adjacentTopics);

  // Append item list
  prompt += '\n## Content Items\n\n';
  for (const item of items) {
    const title = item.title.length > MAX_TITLE_LENGTH
      ? item.title.slice(0, MAX_TITLE_LENGTH) + '...'
      : item.title;
    prompt += `[${item.index}] "${title}" (source: ${item.source})\n`;
  }

  return prompt;
}
