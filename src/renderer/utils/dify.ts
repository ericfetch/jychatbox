import { fetchEventSource } from '@microsoft/fetch-event-source';

interface DifyCallOptions {
  apiKey: string;
  prompt: string;
  sessionId?: string;
  stream?: boolean;
  parameters?: Record<string, any>;
  signal?: AbortSignal;
  inputs?: Record<string, any>;
  user?: string;
  messageHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class DifyClient {
  private baseUrl: string;

  private apiKey: string;

  private defaultTimeout: number;

  private defaultMaxRetries: number;

  private currentAbortController: AbortController | null = null;

  constructor(
    apiKey: string = '',
    baseUrl: string = 'https://api.dify.ai/v1',
    defaultTimeout: number = 2000,
    defaultMaxRetries: number = 3,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
    this.defaultMaxRetries = defaultMaxRetries;
  }

  abort() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  private validateApiKey(apiKey?: string): void {
    if (!apiKey) {
      throw new Error('API Key is required');
    }
  }

  private createPayload(
    prompt: string,
    parameters: Record<string, any> = {},
    inputs: Record<string, any> = {},
    stream: boolean = true,
  ): Record<string, any> {
    return {
      inputs,
      query: prompt,
      response_mode: stream ? 'streaming' : 'blocking',
      user: 'jy',
      ...parameters,
    };
  }

  async callWithSSE({
    prompt,
    apiKey,
    parameters = {},
    inputs = {},
    maxRetries = this.defaultMaxRetries,
    onMessage = (content: string) => {},
    onError = (error: Error) => {},
    onComplete = () => {},
  }: {
    prompt: string;
    apiKey?: string;
    parameters?: Record<string, any>;
    inputs?: Record<string, any>;
    maxRetries?: number;
    onMessage?: (content: string) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
  }): Promise<void> {
    const effectiveApiKey = apiKey || this.apiKey;
    this.validateApiKey(effectiveApiKey);

    this.currentAbortController = new AbortController();

    const payload = this.createPayload(prompt, parameters, inputs, true);

    const url = `${this.baseUrl}/chat-messages`;
    let accumulatedContent = '';
    let retryCount = 0;

    try {
      await fetchEventSource(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: this.currentAbortController.signal,
        onopen: async (response) => {
          if (response.ok) {
            return;
          }

          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = `Error ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorText);
        },
        onmessage: (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'message') {
              accumulatedContent += data.answer || '';
              onMessage(accumulatedContent);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e, event.data);
          }
        },
        onerror: (err) => {
          retryCount++;
          if (retryCount <= maxRetries) {
            return; // 允许重试
          }
          onError(err);
          throw err; // 超过重试次数，抛出错误
        },
        onclose: () => {},
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    } finally {
      onComplete();
      this.currentAbortController = null;
    }
  }
}

export default DifyClient;
