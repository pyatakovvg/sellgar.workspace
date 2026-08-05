import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'node:https';

export interface AgentMessage {
  readonly role: 'assistant' | 'user';
  readonly content: string;
}

interface GroqOutputContent {
  readonly type?: string;
  readonly text?: string;
}

interface GroqOutputItem {
  readonly type?: string;
  readonly content?: readonly GroqOutputContent[];
}

interface GroqResponse {
  readonly error?: { readonly message?: string } | null;
  readonly output?: readonly GroqOutputItem[];
}

interface GroqHttpResponse {
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly body: string;
}

@Injectable()
export class GroqAgentGateway {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('GROQ_API_KEY');
    this.model = config.get<string>('AI_MODEL') ?? 'openai/gpt-oss-20b';
  }

  async respond(messages: readonly AgentMessage[]): Promise<string> {
    const response = await this.request(messages);
    const payload = this.parseResponse(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(
        `Groq request failed (${response.statusCode}): ${payload?.error?.message ?? response.statusMessage}`,
      );
    }

    const text =
      payload?.output
        ?.flatMap((item) => item.content ?? [])
        .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
        .map((content) => content.text)
        .join('\n')
        .trim() ?? '';

    if (text.length === 0) {
      throw new Error('Groq response does not contain assistant text.');
    }

    return text;
  }

  private request(messages: readonly AgentMessage[]): Promise<GroqHttpResponse> {
    const body = JSON.stringify({
      model: this.model,
      input: messages,
      reasoning: { effort: 'low' },
      store: false,
    });

    return new Promise((resolve, reject) => {
      const httpRequest = request(
        {
          hostname: 'api.groq.com',
          path: '/openai/v1/responses',
          method: 'POST',
          family: 4,
          timeout: 120_000,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (httpResponse) => {
          httpResponse.setEncoding('utf8');
          let responseBody = '';

          httpResponse.on('data', (chunk: string) => {
            responseBody += chunk;
          });
          httpResponse.on('end', () => {
            resolve({
              statusCode: httpResponse.statusCode ?? 500,
              statusMessage: httpResponse.statusMessage ?? 'Unknown error',
              body: responseBody,
            });
          });
        },
      );

      httpRequest.on('timeout', () => {
        httpRequest.destroy(new Error('Groq request timed out.'));
      });
      httpRequest.on('error', reject);
      httpRequest.end(body);
    });
  }

  private parseResponse(body: string): GroqResponse | null {
    try {
      return JSON.parse(body) as GroqResponse;
    } catch {
      return null;
    }
  }
}
