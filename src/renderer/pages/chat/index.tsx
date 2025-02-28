import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Alert, Snackbar } from '@mui/material';
import { saveAs } from 'file-saver';
import Text from '../../components/Text';
import './chat.scss';
import store from '../../utils/store';
import DashScopeClient from '../../utils/aliyun';
import TencentAIClient from '../../utils/tencent';
import { Chat, Message } from '../../utils/chatStore';
import AIAvatar from '../../components/AIAvatar';
import WelcomeMessage from '../../components/welcome';
import aiImg from '../../../../assets/ai_avatar.png';
import AITextShow from '../../components/AITextShow';
import ChatInfoShow from '../../components/ChatInfoShow';
import AD from '../../components/AD';
import DifyClient from '../../utils/dify';
import OllamaClient from '../../utils/ollama';

const dashScopeClient = new DashScopeClient();
const client = new TencentAIClient();
const difyClient = new DifyClient();
const ollamaClient = new OllamaClient();

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [copySuccess, setCopySuccess] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    store.chat.onActiveChatChange((chat) => {
      setActiveChat(chat);
      setMessages(chat.messages || []);
      setTimeout(scrollToBottom, 100);
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat?.id) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    store.chat.pushMessage(userMessage);
    setMessage('');
    setIsLoading(true);

    const aiResponseMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    if (activeChat?.modelType === 'aliyun') {
      // 重置 AbortController
      dashScopeClient.abort();

      const finalAiMessage: Message = {
        id: aiResponseMessage.id,
        role: 'assistant',
        content: '我在思考……',
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, finalAiMessage]);

      // 默认使用非流式调用，除非明确指定了流式调用
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
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...finalAiMessage,
            };
            return updatedMessages;
          });
        },
        onComplete: () => {
          store.chat.pushMessage(finalAiMessage);
          setIsLoading(false);
        },
        onError: (error: Error) => {
          console.error('阿里云AI调用错误:', error);
          finalAiMessage.content = `调用出错: ${error.message}`;
          store.chat.pushMessage(finalAiMessage);
          setIsLoading(false);
        },
      });
    } else if (activeChat?.modelType === 'tencent') {
      const finalAiMessage: Message = {
        id: aiResponseMessage.id,
        role: 'assistant',
        content: '我在思考……',
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, finalAiMessage]);

      await client.callWithSSE({
        prompt: message,
        apiKey: activeChat.apiKey,
        aiRole: activeChat.aiRole || '',
        onTokensCount: (tokensCount: number) => {
          finalAiMessage.tokens = tokensCount;
        },
        onMessage: (content: string) => {
          finalAiMessage.content = content;
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...finalAiMessage,
            };
            return updatedMessages;
          });
        },
        onComplete: () => {
          store.chat.pushMessage(finalAiMessage);
          setIsLoading(false);
        },
        onError: (error: Error) => {
          console.error('腾讯AI调用错误:', error);
          finalAiMessage.content = `调用出错: ${error.message}`;
          store.chat.pushMessage(finalAiMessage);
          setIsLoading(false);
        },
      });
    } else if (activeChat?.modelType === 'dify') {
      const finalAiMessage: Message = {
        id: aiResponseMessage.id,
        role: 'assistant',
        content: '我在思考……',
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, finalAiMessage]);

      await difyClient.callWithSSE({
        apiKey: activeChat.apiKey || '',
        prompt: message,
        onMessage: (content: string) => {
          finalAiMessage.content = content;
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...finalAiMessage,
            };
            return updatedMessages;
          });
        },
        onComplete: () => {
          store.chat.pushMessage(finalAiMessage);
          setIsLoading(false);
        },
        onError: (error: Error) => {
          console.error('Dify AI调用错误:', error);
          finalAiMessage.content = `调用出错: ${error.message}`;
          store.chat.pushMessage(finalAiMessage);
          setIsLoading(false);
        },
      });
    } else if (activeChat?.modelType === 'ollama') {
      const finalAiMessage: Message = {
        id: aiResponseMessage.id,
        role: 'assistant',
        content: '我在思考……',
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, finalAiMessage]);

      await ollamaClient.callWithSSE({
        model: store.config.getConfigById(activeChat.modelId)?.subModel || '',
        messages: [{ role: 'user', content: message }],
        onMessage: (content: string) => {
          finalAiMessage.content = content;
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...finalAiMessage,
            };
            return updatedMessages;
          });
        },
        onComplete: () => {
          store.chat.pushMessage(finalAiMessage);
          setIsLoading(false);
        },
      });
    }
  };

  const handleAbort = () => {
    if (activeChat?.modelType === 'tencent') {
      client.abort();
    } else if (activeChat?.modelType === 'aliyun') {
      dashScopeClient.abort();
    } else if (activeChat?.modelType === 'dify') {
      difyClient.abort();
    }
  };

  // 处理搜索功能
  const handleSearch = (text: string) => {
    if (!text.trim() || !messages.length) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);

      return;
    }
    setSearchText(text);
    const results: number[] = [];
    messages.forEach((msg, index) => {
      if (msg.content.toLowerCase().includes(text.toLowerCase())) {
        results.push(index);
      }
    });

    setSearchResults(results);

    if (results.length > 0) {
      setCurrentSearchIndex(0);
      scrollToMessage(results[0]);
    }
  };

  // 滚动到指定消息
  const scrollToMessage = (index: number) => {
    const messageId = messages[index]?.id;
    if (messageId && messageRefs.current[messageId]) {
      messageRefs.current[messageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  // 导航到下一个搜索结果
  const navigateToNextResult = () => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchResults[nextIndex]);
  };

  // 导航到上一个搜索结果
  const navigateToPrevResult = () => {
    if (searchResults.length === 0) return;

    const prevIndex =
      (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchResults[prevIndex]);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchText('');
    setSearchResults([]);
    setCurrentSearchIndex(-1);
  };

  const handleClearMessages = (chatId: string) => {
    store.chat.clearMessages(chatId);
  };

  const handleUpdateChat = (updatedChat: Chat) => {
    store.chat.updateChat(updatedChat);
  };

  // 添加复制消息内容的函数
  const handleCopyMessage = (content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopySuccess(true);
      })
      .catch((err) => {
        console.error('复制失败:', err);
      });
  };

  // 关闭复制成功提示
  const handleCloseCopySuccess = () => {
    setCopySuccess(false);
  };

  // 添加导出消息到文本文件的函数
  const handleExportMessage = (content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    saveAs(blob, `message_${timestamp}.txt`);
  };

  return (
    <>
      {activeChat ? (
        <div className="chat-container">
          <ChatInfoShow
            activeChat={activeChat}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            onClearMessages={handleClearMessages}
            onUpdateChat={handleUpdateChat}
          />
          {isLoading && (
            <div className="chat-abort" onClick={handleAbort}>
              ⏹️中止
            </div>
          )}
          {searchText.trim() !== '' && searchResults.length > 0 && (
            <div className="search-navigation">
              <span className="search-info">
                {currentSearchIndex + 1}/{searchResults.length}
              </span>
              <div className="search-buttons">
                <button className="nav-btn" onClick={navigateToPrevResult}>
                  ↑
                </button>
                <button className="nav-btn" onClick={navigateToNextResult}>
                  ↓
                </button>
              </div>
            </div>
          )}
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div
                className="chat-message"
                data-chat-title={activeChat?.title}
                data-message-id={msg.id}
                key={msg.id + activeChat?.id}
                ref={(el) => (messageRefs.current[msg.id] = el)}
              >
                {msg.role === 'assistant' && (
                  <AIAvatar src={aiImg} alt="AI Avatar" />
                )}
                <div className={`message ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="message-operate">
                      <div className="message-operate-btn">
                        <div
                          className="nav-btn"
                          onClick={() => handleCopyMessage(msg.content)}
                        >
                          复制
                        </div>
                        <div
                          className="nav-btn"
                          onClick={() => handleExportMessage(msg.content)}
                        >
                          导出
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="message-content">
                    <AITextShow content={msg.content} searchText={searchText} />
                  </div>
                  {msg.tokens && (
                    <div className="tokens">tokens:{msg.tokens}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && <div className="loading">正在生成...</div>}
            <div ref={messagesEndRef} />
          </div>
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
            <div
              className={`submit-btn ${isLoading ? 'disabled' : ''}`}
              onClick={!isLoading ? handleSendMessage : undefined}
            >
              {isLoading ? '生成中...' : '发送'}
            </div>
          </div>
          <AD />
        </div>
      ) : (
        <div className="chat-container">
          <div className="chat-doc">
            <WelcomeMessage />
          </div>
        </div>
      )}
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={handleCloseCopySuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseCopySuccess}
          severity="success"
          sx={{ width: '100%' }}
        >
          消息已复制到剪贴板
        </Alert>
      </Snackbar>
    </>
  );
}
