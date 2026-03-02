/**
 * LLM provider factory.
 *
 * Reads LLM_PROVIDER and LLM_MODEL env vars to return the appropriate
 * AI SDK model instance. Provider is swappable without code changes.
 *
 * When no API key is configured, returns null — the pipeline should
 * auto-approve all content. When an API key is later provided, new
 * content will go through proper LLM moderation.
 */

import { type LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export interface ProviderConfig {
  model: LanguageModel;
  costPerInputToken: number;   // USD per token
  costPerOutputToken: number;  // USD per token
  name: string;                // e.g., 'openai/gpt-4.1-nano'
}

/**
 * Returns true if an LLM API key is configured for the current provider.
 * Used by the pipeline to decide whether to run LLM moderation or
 * auto-approve all content.
 */
export function hasApiKey(): boolean {
  const provider = process.env.LLM_PROVIDER || 'openai';
  switch (provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'mock':
      return true;
    default:
      return false;
  }
}

/**
 * Returns an AI SDK model instance based on environment configuration.
 *
 * Env vars:
 *   LLM_PROVIDER - 'openai' (default), 'anthropic', or 'mock'
 *   LLM_MODEL    - model name (defaults vary by provider)
 */
export function getProvider(): ProviderConfig {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const model = process.env.LLM_MODEL;

  switch (provider) {
    case 'openai': {
      const modelName = model || 'gpt-4.1-nano';
      return {
        model: openai(modelName),
        costPerInputToken: 0.10 / 1_000_000,   // GPT-4.1 Nano default
        costPerOutputToken: 0.40 / 1_000_000,
        name: `openai/${modelName}`,
      };
    }
    case 'anthropic': {
      const modelName = model || 'claude-haiku-4-5';
      return {
        model: anthropic(modelName),
        costPerInputToken: 1.00 / 1_000_000,
        costPerOutputToken: 5.00 / 1_000_000,
        name: `anthropic/${modelName}`,
      };
    }
    case 'mock': {
      // For testing -- satisfies the type without making real API calls.
      // Plan 02 will add actual mock behavior using MockLanguageModelV3
      // from ai/test if needed.
      return {
        model: {} as LanguageModel,
        costPerInputToken: 0,
        costPerOutputToken: 0,
        name: 'mock/mock',
      };
    }
    default:
      throw new Error(
        `Unknown LLM_PROVIDER: "${provider}". Valid providers: openai, anthropic, mock`
      );
  }
}
