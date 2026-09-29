import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  constructor(private configService: ConfigService) {}

  async extractProfile(prompt: string, selections: any): Promise<any | null> {
    // TODO: AI teammate implements
    return null;
  }

  async composePlan(
    profile: any,
    candidates: any[],
    lockedItems: any[],
  ): Promise<
    | {
        catalogueItemId: number;
        startAt: string;
        endAt: string;
        why: string;
        upsellItemId?: number;
        upsellReason?: string;
      }[]
    | null
  > {
    // TODO: AI teammate implements
    return null;
  }

  async reshapePlan(
    message: string,
    profile: any,
    currentItems: any[],
    candidates: any[],
  ): Promise<{
    understood: boolean;
    changes: string[];
    profilePatch: any;
    items: any[];
  } | null> {
    // TODO: AI teammate implements
    return null;
  }

  async narrateMemory(
    timeline: any[],
    profile: any,
  ): Promise<{ title: string; chapters: any[]; closingLine: string } | null> {
    // TODO: AI teammate implements
    return null;
  }

  private async callLlm(
    system: string,
    user: string,
    timeoutMs = 10000,
  ): Promise<any | null> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return null;

    const model =
      this.configService.get<string>('LLM_MODEL') || 'claude-sonnet-5-5';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          system,
          messages: [{ role: 'user', content: user }],
        }),
        signal: controller.signal as any,
      });

      if (!response.ok) return null;

      const data = await response.json();
      const text = data.content
        ?.filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      if (!text) return null;

      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) return null;

      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
