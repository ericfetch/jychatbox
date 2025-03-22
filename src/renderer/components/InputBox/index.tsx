import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import BrainIcon from '@mui/icons-material/Psychology';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import StopIcon from '@mui/icons-material/Stop';
import Text from '../Text';
import './index.scss';
import store from '../../utils/store';
import DashScopeClient from '../../utils/aliyun';
import TencentAIClient from '../../utils/tencent';
import DifyClient from '../../utils/dify';
import OllamaClient from '../../utils/ollama';
import { Chat, Message } from '../../utils/chatStore';

const dashScopeClient = new DashScopeClient();
const tencentClient = new TencentAIClient();
const difyClient = new DifyClient();
const ollamaClient = new OllamaClient();

interface InputBoxProps {
  activeChat: Chat | null;
  onMessageReceived: (message: Message) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

function InputBox(props: InputBoxProps) {
  const { activeChat, onMessageReceived, onLoadingChange } = props;
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContextMemoryOpen, setIsContextMemoryOpen] = useState(() => {
    if (!activeChat || !activeChat.id) return false;
    return store.get(`contextMemory_${activeChat.id}`) || false;
  });

  useEffect(() => {
    return () => {
      dashScopeClient.abort();
      tencentClient.abort();
      difyClient.abort();
      ollamaClient.abort();
    };
  }, []);

  useEffect(() => {
    if (activeChat && activeChat.id) {
      const savedState = store.get(`contextMemory_${activeChat.id}`);
      setIsContextMemoryOpen(savedState || false);
    } else {
      setIsContextMemoryOpen(false);
    }
  }, [activeChat]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat?.id) return;

    // 创建用户消息
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    // 将用户消息添加到消息列表并存储
    store.chat.pushMessage(userMessage);
    onMessageReceived(userMessage);

    // 清空输入框并设置加载状态
    setMessage('');
    setIsLoading(true);
    onLoadingChange(true);

    // 创建AI响应消息
    const aiResponseMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    // 根据不同的模型类型调用不同的AI服务
    if (activeChat?.modelType === 'aliyun') {
      await handleAliyunAI(aiResponseMessage);
    } else if (activeChat?.modelType === 'tencent') {
      await handleTencentAI(aiResponseMessage);
    } else if (activeChat?.modelType === 'dify') {
      await handleDifyAI(aiResponseMessage);
    } else if (activeChat?.modelType === 'ollama') {
      await handleOllamaAI(aiResponseMessage);
    }
  };

  const handleAliyunAI = async (aiMessage: Message) => {
    // 重置 AbortController
    dashScopeClient.abort();

    const finalAiMessage: Message = {
      id: aiMessage.id,
      role: 'assistant',
      content: '我在思考……',
      timestamp: Date.now(),
    };
    onMessageReceived(finalAiMessage);

    await dashScopeClient.callWithSSE({
      appId: activeChat?.appId || '',
      apiKey: activeChat?.apiKey || '',
      prompt: message,
      sessionId: activeChat?.id || uuidv4(),
      aiRole: activeChat?.aiRole || '',
      onTokensCount: (tokensCount: number) => {
        finalAiMessage.tokens = tokensCount;
      },
      onMessage: (content: string) => {
        finalAiMessage.content = content;
        onMessageReceived({ ...finalAiMessage });
      },
      onComplete: () => {
        store.chat.pushMessage(finalAiMessage);
        setIsLoading(false);
        onLoadingChange(false);
      },
      onError: (error: Error) => {
        console.error('阿里云AI调用错误:', error);
        finalAiMessage.content = `调用出错: ${error.message}`;
        store.chat.pushMessage(finalAiMessage);
        onMessageReceived({ ...finalAiMessage });
        setIsLoading(false);
        onLoadingChange(false);
      },
    });
  };

  const handleTencentAI = async (aiMessage: Message) => {
    const finalAiMessage: Message = {
      id: aiMessage.id,
      role: 'assistant',
      content: '我在思考……',
      timestamp: Date.now(),
    };
    onMessageReceived(finalAiMessage);

    await tencentClient.callWithSSE({
      prompt: message,
      apiKey: activeChat?.apiKey || '',
      aiRole: activeChat?.aiRole || '',
      onTokensCount: (tokensCount: number) => {
        finalAiMessage.tokens = tokensCount;
      },
      onMessage: (content: string) => {
        finalAiMessage.content = content;
        onMessageReceived({ ...finalAiMessage });
      },
      onComplete: () => {
        store.chat.pushMessage(finalAiMessage);
        setIsLoading(false);
        onLoadingChange(false);
      },
      onError: (error: Error) => {
        console.error('腾讯AI调用错误:', error);
        finalAiMessage.content = `调用出错: ${error.message}`;
        store.chat.pushMessage(finalAiMessage);
        onMessageReceived({ ...finalAiMessage });
        setIsLoading(false);
        onLoadingChange(false);
      },
    });
  };

  const handleDifyAI = async (aiMessage: Message) => {
    const finalAiMessage: Message = {
      id: aiMessage.id,
      role: 'assistant',
      content: '我在思考……',
      timestamp: Date.now(),
    };
    onMessageReceived(finalAiMessage);

    await difyClient.callWithSSE({
      apiKey: activeChat?.apiKey || '',
      prompt: message,
      onMessage: (content: string) => {
        finalAiMessage.content = content;
        onMessageReceived({ ...finalAiMessage });
      },
      onComplete: () => {
        store.chat.pushMessage(finalAiMessage);
        setIsLoading(false);
        onLoadingChange(false);
      },
      onError: (error: Error) => {
        console.error('Dify AI调用错误:', error);
        finalAiMessage.content = `调用出错: ${error.message}`;
        store.chat.pushMessage(finalAiMessage);
        onMessageReceived({ ...finalAiMessage });
        setIsLoading(false);
        onLoadingChange(false);
      },
    });
  };

  const handleOllamaAI = async (aiMessage: Message) => {
    const finalAiMessage: Message = {
      id: aiMessage.id,
      role: 'assistant',
      content: '我在思考……',
      timestamp: Date.now(),
    };
    onMessageReceived(finalAiMessage);

    await ollamaClient.callWithSSE({
      model:
        store.config.getConfigById(activeChat?.modelId || '')?.subModel || '',
      messages: [{ role: 'user', content: message }],
      onMessage: (content: string) => {
        finalAiMessage.content = content;
        onMessageReceived({ ...finalAiMessage });
      },
      onComplete: () => {
        store.chat.pushMessage(finalAiMessage);
        setIsLoading(false);
        onLoadingChange(false);
      },
    });
  };

  const handleAbort = () => {
    if (activeChat?.modelType === 'tencent') {
      tencentClient.abort();
    } else if (activeChat?.modelType === 'aliyun') {
      dashScopeClient.abort();
    } else if (activeChat?.modelType === 'dify') {
      difyClient.abort();
    }
    setIsLoading(false);
    onLoadingChange(false);
  };

  const handleToggleContextMemory = () => {
    if (!activeChat || !activeChat.id) return;

    const newState = !isContextMemoryOpen;
    setIsContextMemoryOpen(newState);
    store.set(`contextMemory_${activeChat.id}`, newState);
  };

  const handleClearContext = () => {
    if (activeChat?.id && window.confirm('确定要清除当前对话的上下文吗？')) {
      // 这里添加清除上下文的逻辑
      // 例如：store.chat.clearMessages(activeChat.id);
      alert('上下文已清除');
    }
  };

  const handleDocumentUpload = () => {
    // 这里添加文档上传的逻辑
    // 可以触发文件选择对话框等操作
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 处理上传的文件
        console.log('上传文件:', file.name);
        // 这里添加文件处理逻辑
      }
    };
    input.click();
  };

  return (
    <>
      {isLoading && (
        <div className="chat-abort" onClick={handleAbort}>
          <StopIcon /> 中止
        </div>
      )}

      <div
        className="chat-input"
        onKeyDown={(e) =>
          !isLoading && e.key === 'Enter' && handleSendMessage()
        }
      >
        <Text
          type="text"
          placeholder="发送消息..."
          value={message}
          onChange={(value: string) => setMessage(value)}
          disabled={isLoading}
        />
        <div className="chat-tools">
          <div
            className={`tool-icon ${isContextMemoryOpen ? 'active' : 'inactive'}`}
            onClick={handleToggleContextMemory}
            title="上下文记忆"
          >
            <BrainIcon />
          </div>
          <div
            className="tool-icon inactive"
            onClick={handleClearContext}
            title="清除上下文"
          >
            <DeleteIcon />
          </div>
          <div
            className="tool-icon inactive"
            onClick={handleDocumentUpload}
            title="上传文档"
          >
            <AttachFileIcon />
          </div>
        </div>
        <div
          className={`submit-btn ${isLoading ? 'disabled' : ''}`}
          onClick={!isLoading ? handleSendMessage : undefined}
        >
          {isLoading ? '生成中...' : '发送'}
        </div>
      </div>
    </>
  );
}

export default InputBox;
