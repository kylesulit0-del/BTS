/**
 * Zod schemas for structured LLM output.
 *
 * Defines the expected shape of batched classification results
 * from the moderation pipeline. Used with AI SDK Output.object()
 * for schema-validated structured output.
 */

import { z } from 'zod';

export const ContentTypeEnum = z.enum([
  'news',
  'fan_art',
  'meme',
  'video',
  'discussion',
  'translation',
  'official',
]);

export const BatchItemDecisionSchema = z.object({
  index: z.number().describe('0-based index matching input order'),
  relevant: z.boolean().describe('Is this content relevant to BTS or BTS-adjacent?'),
  safe: z.boolean().describe('Is this content safe and appropriate?'),
  contentType: ContentTypeEnum.describe('Single content type classification'),
});

export const BatchResultSchema = z.object({
  items: z.array(BatchItemDecisionSchema),
});

export type ContentTypeValue = z.infer<typeof ContentTypeEnum>;
export type BatchItemDecision = z.infer<typeof BatchItemDecisionSchema>;
export type BatchResult = z.infer<typeof BatchResultSchema>;
