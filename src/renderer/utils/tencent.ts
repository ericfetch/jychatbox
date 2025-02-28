import { v4 as uuidv4 } from 'uuid';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export class TencentClient {
  private baseUrl: string;

  private defaultTimeout: number;

  private defaultMaxRetries: number;

  private currentAbortController: AbortController | null = null;

  constructor(
    baseUrl: string = 'https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse',
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
    apiKey?: string,
    sessionId: string = uuidv4(),
    parameters: Record<string, any> = {},
    aiRole: string = '',
  ): Record<string, any> {
    return {
      request_id: uuidv4(),
      content: prompt,
      session_id: sessionId,
      bot_app_key: apiKey,
      visitor_biz_id: sessionId, // 可以使用sessionId作为访客ID
      system_role: aiRole || '',
      ...parameters,
    };
  }

  async callWithSSE({
    prompt,
    apiKey,
    sessionId = uuidv4(),
    parameters = {},
    timeout = this.defaultTimeout,
    maxRetries = this.defaultMaxRetries,
    bufferTime = 3000,
    onMessage = (content: string) => {},
    onTokensCount = (count: number) => {},
    onError = (error: Error) => {},
    onComplete = () => {},
    aiRole = '',
  }: {
    prompt: string;
    apiKey?: string;
    sessionId?: string;
    parameters?: Record<string, any>;
    timeout?: number;
    maxRetries?: number;
    bufferTime?: number;
    onMessage?: (content: string) => void;
    onTokensCount?: (count: number) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
    aiRole?: string;
  }): Promise<void> {
    this.validateApiKey(apiKey);
    this.currentAbortController = new AbortController();

    const payload = this.createPayload(
      prompt,
      apiKey,
      sessionId,
      parameters,
      aiRole,
    );

    let previousContent = ''; // 跟踪之前收到的完整内容
    let bufferTimer: NodeJS.Timeout | null = null;
    let retryCount = 0;

    try {
      await fetchEventSource(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
            const { type, payload } = data;

            if (type === 'reply') {
              const { content } = payload;
              
              // 如果内容有变化，则发送新内容
              if (content !== previousContent) {
                onMessage(content);
                previousContent = content;
              }
            } else if (type === 'token_stat') {
              const { token_count } = payload;
              onTokensCount(token_count);
            }
          } catch (e) {
            // 尝试从字符串中提取内容
            const match = event.data.match(/"content":"([^"]*)"/);
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

export default TencentClient;
