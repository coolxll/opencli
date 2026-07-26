import type { IncomingMessage, ServerResponse } from 'node:http';

export type SessionMode = 'auto' | 'fresh' | 'reuse';

export interface AnthropicRequest {
  model?: string;
  max_tokens?: number;
  system?: string | Array<{ type: string; text: string }>;
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>;
  stream?: boolean;
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence: null;
  usage: { input_tokens: number; output_tokens: number };
}

interface NormalizedMessage {
  role: 'user' | 'assistant';
  text: string;
}

export function generateMsgId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'msg_';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3));
}

export function extractTextContent(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === 'string') return content;
  return content
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text!)
    .join('\n');
}

export function extractSystemText(system?: AnthropicRequest['system']): string {
  if (!system) return '';
  if (typeof system === 'string') return system.trim();
  return system
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text!.trim())
    .filter(Boolean)
    .join('\n');
}

function normalizeMessages(messages: AnthropicRequest['messages']): NormalizedMessage[] {
  return messages
    .filter((message): message is AnthropicRequest['messages'][number] & { role: 'user' | 'assistant' } =>
      message.role === 'user' || message.role === 'assistant',
    )
    .map((message) => ({
      role: message.role,
      text: extractTextContent(message.content).trim(),
    }))
    .filter((message) => message.text.length > 0);
}

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

export function jsonResponse(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
  });
  res.end(JSON.stringify(data));
}

export function resolveSessionMode(
  body: AnthropicRequest,
  configuredMode: SessionMode,
): Exclude<SessionMode, 'auto'> {
  if (configuredMode !== 'auto') return configuredMode;
  const systemText = extractSystemText(body.system);
  const normalized = normalizeMessages(body.messages);
  return systemText || normalized.length > 1 ? 'fresh' : 'reuse';
}

export function buildLingmaPrompt(body: AnthropicRequest, mode: Exclude<SessionMode, 'auto'>): string {
  const normalized = normalizeMessages(body.messages);
  const lastUser = [...normalized].reverse().find((message) => message.role === 'user');
  if (!lastUser) {
    throw new Error('No user message found in request');
  }

  if (mode === 'reuse') {
    return lastUser.text;
  }

  const systemText = extractSystemText(body.system);
  if (!systemText && normalized.length === 1) {
    return lastUser.text;
  }

  const parts: string[] = [];
  if (systemText) {
    parts.push('System instructions:');
    parts.push(systemText);
  }

  parts.push('Conversation transcript:');
  for (const message of normalized) {
    parts.push(`${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`);
  }

  parts.push('Reply as the assistant to the latest user message only. Follow the system instructions and prior transcript naturally.');
  return parts.join('\n\n');
}
