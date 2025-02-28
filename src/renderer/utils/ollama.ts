import { v4 as uuidv4 } from 'uuid';
import { fetchEventSource } from './fetchEventSource/index';

// 定义消息类型
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[]; // 用于多模态模型的base64编码图片
  tool_calls?: any[]; // 工具调用
}

// 定义调用选项接口
export interface OllamaCallOptions {
  model: string;
  messages: ChatMessage[];
  tools?: any[];
  format?: string | object; // 支持 "json" 或 JSON 模式
  options?: Record<string, any>;
  stream?: boolean;
  keepAlive?: string; // 例如 "5m"
  signal?: AbortSignal;
}

export class OllamaClient {
  private baseUrl: string;

  private defaultTimeout: number;

  private defaultMaxRetries: number;

  private currentAbortController: AbortController | null = null;

  constructor(
    baseUrl: string = 'http://localhost:11434',
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

  private createPayload(options: OllamaCallOptions): any {
    const payload: any = {
      model: options.model,
      messages: options.messages,
      stream: options.stream !== false, // 默认为 true
    };

    // 添加可选参数
    if (options.tools) {
      payload.tools = options.tools;
    }

    if (options.format) {
      payload.format = options.format;
    }

    if (options.options) {
      payload.options = options.options;
    }

    if (options.keepAlive) {
      payload.keep_alive = options.keepAlive;
    }

    return payload;
  }

  async callWithSSE({
    model,
    messages,
    tools,
    format,
    options = {},
    stream = true,
    keepAlive,
    timeout = this.defaultTimeout,
    maxRetries = this.defaultMaxRetries,
    onMessage = (content: string) => {},
    onError = (error: Error) => {},
    onComplete = () => {},
    signal,
  }: {
    model: string;
    messages: ChatMessage[];
    tools?: any[];
    format?: string | object;
    options?: Record<string, any>;
    stream?: boolean;
    keepAlive?: string;
    timeout?: number;
    maxRetries?: number;
    onMessage?: (content: string) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
    signal?: AbortSignal;
  }): Promise<void> {
    // 创建新的 AbortController 用于此次请求
    this.currentAbortController = signal
      ? ({ abort: () => {}, signal } as AbortController)
      : new AbortController();

    // 超时处理
    const timeoutId = setTimeout(() => {
      this.abort();
      onError(new Error('Request timed out'));
    }, timeout);

    let retryCount = 0;
    let previousContent = '';

    const payload = {
      model,
      messages,
      stream,
      ...(tools && { tools }),
      ...(format && { format }),
      ...(Object.keys(options).length > 0 && { options }),
      ...(keepAlive && { keep_alive: keepAlive }),
    };

    try {
      await fetchEventSource(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: this.currentAbortController.signal,
        onmessage: (event) => {
          console.log('event', event);
          // 清除超时定时器
          clearTimeout(timeoutId);
          try {
            const data = JSON.parse(event.data);

            // 检查是否是最后一条消息
            if (data.done) {
              // 对于最终消息，可能包含统计信息，这里可以忽略
              return;
            }

            // 检查是否包含消息内容
            if (data.message && data.message.content !== undefined) {
              const { content } = data.message;

              // 如果内容有变化，则发送新内容
              if (content !== previousContent) {
                onMessage(content);
                previousContent = content;
              }
            }
          } catch (error) {
            onError(new Error(`Failed to parse event data: ${error.message}`));
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
          // 官方API关闭处理
        },
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    } finally {
      // 确保调用完成回调
      clearTimeout(timeoutId);
      onComplete();
      this.currentAbortController = null;
    }
  }

  // 生成文本补全（非聊天模式的API）
  async generate(
    model: string,
    prompt: string,
    options: Record<string, any> = {},
    onMessage: (content: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
  ): Promise<void> {
    // 创建新的 AbortController
    this.currentAbortController = options.signal
      ? ({ abort: () => {}, signal: options.signal } as AbortController)
      : new AbortController();

    // 超时处理
    const timeoutId = setTimeout(() => {
      this.abort();
      onError(new Error('Request timed out'));
    }, this.defaultTimeout);

    let retryCount = 0;
    const maxRetries = this.defaultMaxRetries;
    let previousContent = '';

    try {
      await fetchEventSource(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          ...options,
        }),
        signal: this.currentAbortController.signal,
        onopen: () => {
          console.log('onopen');
        },
        onmessage: (event) => {
          // 清除超时定时器
          clearTimeout(timeoutId);

          try {
            const data = JSON.parse(event.data);

            // 如果完成，则忽略
            if (data.done) {
              return;
            }

            // 检查是否包含响应
            if (data.response !== undefined) {
              const content = data.response;

              // 如果内容有变化，则发送新内容
              if (content !== previousContent) {
                onMessage(content);
                previousContent = content;
              }
            }
          } catch (error) {
            onError(new Error(`Failed to parse event data: ${error.message}`));
          }
        },
        onerror: (err) => {
          console.log('err', err);
          retryCount++;
          if (retryCount <= maxRetries) {
            return; // 允许重试
          }
          onError(err);
          throw err;
        },
        onclose: () => {
          // API关闭处理
        },
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    } finally {
      clearTimeout(timeoutId);
      onComplete();
      this.currentAbortController = null;
    }
  }
}

export default OllamaClient;
