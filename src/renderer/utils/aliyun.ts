import { v4 as uuidv4 } from 'uuid';
import { fetchEventSource } from '@microsoft/fetch-event-source';

interface DashScopeCallOptions {
  appId: string;
  prompt: string;
  apiKey?: string;
  sessionId?: string;
  stream?: boolean;
  parameters?: Record<string, any>;
  signal?: AbortSignal;
  aiRole?: string;
}

export class DashScopeClient {
  private baseUrl: string;

  private defaultTimeout: number;

  private defaultMaxRetries: number;

  private currentAbortController: AbortController | null = null;

  constructor(
    baseUrl: string = 'https://dashscope.aliyuncs.com/api/v1/apps',
    defaultTimeout: number = 60000,
    defaultMaxRetries: number = 3,
  ) {
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
      throw new Error('API key is required');
    }
  }

  private createPayload(
    prompt: string,
    sessionId: string = uuidv4(),
    parameters: Record<string, any> = {},
    aiRole: string = '',
  ): Record<string, any> {
    return {
      input: {
        prompt,
        session_id: sessionId,
        ai_role: aiRole || undefined,
      },
      parameters: {
        ...parameters,
      },
    };
  }

  async callWithSSE({
    appId,
    prompt,
    apiKey,
    sessionId = uuidv4(),
    parameters = {},
    timeout = this.defaultTimeout,
    maxRetries = this.defaultMaxRetries,
    onMessage = (content: string) => {},
    onError = (error: Error) => {},
    onComplete = () => {},
    aiRole = '',
    onTokensCount = (tokensCount: number) => {},
  }: {
    appId: string;
    prompt: string;
    apiKey?: string;
    sessionId?: string;
    parameters?: Record<string, any>;
    timeout?: number;
    maxRetries?: number;
    onMessage?: (content: string) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
    aiRole?: string;
    onTokensCount?: (tokensCount: number) => void;
  }): Promise<void> {
    this.validateApiKey(apiKey);

    if (!appId) {
      throw new Error('AppId is required');
    }

    this.currentAbortController = new AbortController();

    const payload = this.createPayload(prompt, sessionId, parameters, aiRole);

    const url = `${this.baseUrl}/${appId}/completion`;
    let previousContent = '';
    let retryCount = 0;

    try {
      await fetchEventSource(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable',
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

            // DashScope 返回的数据结构
            if (data.output && data.output.text) {
              const content = data.output.text;

              // 如果内容有变化，则发送新内容
              if (content !== previousContent) {
                onMessage(content);
                previousContent = content;
              }
            }

            // 提取 tokens 使用信息
            if (
              data.usage &&
              data.usage.models &&
              data.usage.models.length > 0
            ) {
              const model = data.usage.models[0];
              if (
                model.input_tokens !== undefined &&
                model.output_tokens !== undefined
              ) {
                onTokensCount(model.input_tokens + model.output_tokens);
              }
            }
          } catch (e) {
            // 尝试从字符串中提取内容
            const match = event.data.match(/"text":"([^"]*)"/);
            if (match) {
              const content = match[1];

              // 如果内容有变化，则发送新内容
              if (content !== previousContent) {
                onMessage(content);
                previousContent = content;
              }
            }
          }
        },
        onerror: (err) => {
          // 处理错误，决定是否重试
          retryCount++;
          if (retryCount <= maxRetries) {
            return; // 允许重试
          }
          onError(err);
          throw err; // 超过重试次数，抛出错误
        },
        onclose: () => {
          // onComplete();
        },
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    } finally {
      // 确保调用完成回调
      onComplete();
      this.currentAbortController = null;
    }
  }
}

export default DashScopeClient;
