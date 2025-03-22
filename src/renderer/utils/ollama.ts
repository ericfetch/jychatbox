import { Ollama } from 'ollama/browser';

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
  private ollama: Ollama;

  private defaultTimeout: number;

  private currentAbortController: AbortController | null = null;

  constructor(
    baseUrl: string = 'http://localhost:11434',
    defaultTimeout: number = 60000,
  ) {
    this.ollama = new Ollama({ host: baseUrl });
    this.defaultTimeout = defaultTimeout;
  }

  abort() {
    // 使用官方库提供的abort方法
    this.ollama.abort();
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
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
      onError(new Error('请求超时'));
    }, timeout);

    let previousContent = '';

    try {
      const response = await this.ollama.chat(
        {
          model,
          messages: messages as any[],
          stream,
          ...(tools && { tools }),
          ...(format && { format }),
          ...(Object.keys(options).length > 0 && { options }),
          ...(keepAlive && { keep_alive: keepAlive }),
        },
        {
          signal: this.currentAbortController.signal,
        },
      );

      if (stream) {
        for await (const chunk of response) {
          clearTimeout(timeoutId);

          if (chunk.message?.content) {
            onMessage(previousContent + chunk.message.content);
            previousContent += chunk.message.content;
          }
        }
      } else if (response.message?.content) {
        clearTimeout(timeoutId);
        onMessage(response.message.content);
      }

      onComplete();
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      clearTimeout(timeoutId);
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
      onError(new Error('请求超时'));
    }, this.defaultTimeout);

    try {
      const response = await this.ollama.generate(
        {
          model,
          prompt,
          stream: true,
          ...options,
        },
        {
          signal: this.currentAbortController.signal,
        },
      );

      let previousContent = '';

      if (options.stream !== false) {
        for await (const chunk of response) {
          clearTimeout(timeoutId);

          if (chunk.response && chunk.response !== previousContent) {
            onMessage(chunk.response);
            previousContent = chunk.response;
          }
        }
      } else if (response.response) {
        clearTimeout(timeoutId);
        onMessage(response.response);
      }

      onComplete();
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      clearTimeout(timeoutId);
      onComplete();
      this.currentAbortController = null;
    }
  }

  // 添加额外实用方法
  async listModels() {
    try {
      return await this.ollama.list();
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async embeddings(text: string | string[], model: string) {
    try {
      return await this.ollama.embed({
        model,
        input: text,
      });
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

export default OllamaClient;
