import React, { useState, useEffect, useRef } from 'react';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Popper, Paper } from '@mui/material';
import './index.css';
import StopIcon from '@mui/icons-material/Stop';
import DashScopeClient from '../../utils/aliyun';
import TencentAIClient from '../../utils/tencent';
import DifyClient from '../../utils/dify';
import OllamaClient from '../../utils/ollama';
import store from '../../utils/store';

const dashScopeClient = new DashScopeClient();
const tencentClient = new TencentAIClient();
const difyClient = new DifyClient();
const ollamaClient = new OllamaClient();

export default function SecondChatBox(props) {
  const { activeChat } = props;
  const [content, setContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [popperPosition, setPopperPosition] = useState({ top: 0, left: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [featureToggles, setFeatureToggles] = useState({
    dictionary: false,
    translation: false,
  });

  // 加载功能开关设置
  useEffect(() => {
    const loadFeatureToggles = async () => {
      if (!activeChat?.id) return;

      const toggles = (await store.get(`chat_features_${activeChat.id}`)) || {
        dictionary: false,
        translation: false,
      };

      setFeatureToggles(toggles);
    };

    loadFeatureToggles();

    return () => {
      // 清理锚点元素
      if (anchorRef.current && document.body.contains(anchorRef.current)) {
        handleClose();
      }
    };
  }, [activeChat]);

  // 监听文本选择事件
  useEffect(() => {
    const handleTextSelection = async () => {
      // 检查字典功能是否开启
      if (!activeChat?.id) return;

      // 如果字典功能未开启，则不响应文本选择
      if (!featureToggles.dictionary && !featureToggles.translation) return;

      const selection = window.getSelection();
      if (selection && selection.toString().trim() !== '') {
        const selectedText = selection.toString();
        setSelectedText(selectedText);

        // 获取选择范围的位置信息
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 设置弹出框位置
        const newPosition = {
          top: rect.bottom,
          left: rect.left + rect.width / 2,
        };
        setPopperPosition(newPosition);

        // 创建一个固定的锚点元素
        if (anchorRef.current && document.body.contains(anchorRef.current)) {
          document.body.removeChild(anchorRef.current);
        }

        const fakeAnchorEl = document.createElement('div');
        fakeAnchorEl.style.position = 'absolute';
        fakeAnchorEl.style.top = `${newPosition.top}px`;
        fakeAnchorEl.style.left = `${newPosition.left}px`;
        fakeAnchorEl.style.width = '0';
        fakeAnchorEl.style.height = '0';
        fakeAnchorEl.style.pointerEvents = 'none';
        document.body.appendChild(fakeAnchorEl);

        anchorRef.current = fakeAnchorEl;
        setAnchorEl(fakeAnchorEl);
      }
    };

    // 添加鼠标抬起事件监听器
    document.addEventListener('mouseup', handleTextSelection);

    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      // 清理锚点元素
      if (anchorRef.current && document.body.contains(anchorRef.current)) {
        document.body.removeChild(anchorRef.current);
        anchorRef.current = null;
      }
    };
  }, [activeChat, featureToggles]);

  // 关闭弹出框
  const handleClose = () => {
    setAnchorEl(null);
    setSelectedText('');
    setContent('');
    // 清理锚点元素
    if (anchorRef.current && document.body.contains(anchorRef.current)) {
      document.body.removeChild(anchorRef.current);
      anchorRef.current = null;
    }
  };

  // 处理查询或翻译选中文本
  const handleAction = async (actionType = 'query') => {
    if (!selectedText || !activeChat) return;

    setIsLoading(true);
    setContent(actionType === 'query' ? '正在查询中...' : '正在翻译中...');

    const prompt =
      actionType === 'query'
        ? `请解释或回答以下内容：${selectedText}`
        : `请翻译以下内容，如果是英文，请翻译成中文，如果是中文，请翻译成英文，如果是单词或者短语，请举例：${selectedText}`;

    const errorPrefix = actionType === 'query' ? '查询出错' : '翻译出错';

    try {
      if (activeChat.modelType === 'tencent') {
        // 调用腾讯API
        await tencentClient.callWithSSE({
          prompt,
          apiKey: activeChat.apiKey || '',
          aiRole: activeChat.aiRole || '',
          onMessage: (content) => {
            setContent(content);
          },
          onComplete: () => {
            setIsLoading(false);
          },
          onError: (error) => {
            setContent(`${errorPrefix}: ${error.message}`);
            setIsLoading(false);
          },
        });
      } else if (activeChat.modelType === 'aliyun') {
        // 调用阿里云API
        await dashScopeClient.callWithSSE({
          appId: activeChat.appId || '',
          apiKey: activeChat.apiKey || '',
          prompt,
          aiRole: activeChat.aiRole || '',
          onMessage: (content) => {
            setContent(content);
          },
          onComplete: () => {
            setIsLoading(false);
          },
          onError: (error) => {
            setContent(`${errorPrefix}: ${error.message}`);
            setIsLoading(false);
          },
        });
      } else if (activeChat.modelType === 'dify') {
        // 调用Dify API
        await difyClient.callWithSSE({
          apiKey: activeChat.apiKey || '',
          prompt,
          onMessage: (content) => {
            setContent(content);
          },
          onComplete: () => {
            setIsLoading(false);
          },
          onError: (error) => {
            setContent(`${errorPrefix}: ${error.message}`);
            setIsLoading(false);
          },
        });
      } else if (activeChat.modelType === 'ollama') {
        // 调用Ollama API
        await ollamaClient.callWithSSE({
          model: activeChat.modelId || '',
          messages: [{ role: 'user', content: prompt }],
          onMessage: (content) => {
            setContent(content);
          },
          onComplete: () => {
            setIsLoading(false);
          },
          onError: (error) => {
            setContent(`${errorPrefix}: ${error.message}`);
            setIsLoading(false);
          },
        });
      } else {
        setContent('不支持的模型类型');
        setIsLoading(false);
      }
    } catch (error) {
      setContent(`${errorPrefix}: ${error.message}`);
      setIsLoading(false);
    }
  };

  // 查询选中文本
  const handleQuery = () => handleAction('query');

  // 翻译选中文本
  const handleTranslate = () => handleAction('translate');

  // 中止查询
  const handleAbort = () => {
    if (activeChat?.modelType === 'tencent') {
      tencentClient.abort();
    } else if (activeChat?.modelType === 'aliyun') {
      dashScopeClient.abort();
    } else if (activeChat?.modelType === 'dify') {
      difyClient.abort();
    } else if (activeChat?.modelType === 'ollama') {
      ollamaClient.abort();
    }
    setIsLoading(false);
  };

  // 自定义组件，用于渲染带有高亮的文本
  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  const open = Boolean(anchorEl);

  return (
    <div className="second-chat-box" ref={containerRef}>
      {/* 弹出框 */}
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom"
        style={{
          zIndex: 1300,
          position: 'absolute',
          top: popperPosition.top,
          left: popperPosition.left,
        }}
        modifiers={[
          {
            name: 'preventOverflow',
            enabled: true,
            options: {
              boundary: document.body,
            },
          },
        ]}
      >
        <Paper className="selection-popper" elevation={3}>
          <div className="selection-actions">
            <button
              className="action-button"
              onClick={() => {
                // 复制选中文本
                navigator.clipboard.writeText(selectedText);
                handleClose();
              }}
            >
              复制
            </button>
            {featureToggles.dictionary && (
              <button className="action-button" onClick={handleQuery}>
                查询
              </button>
            )}
            {featureToggles.translation && (
              <button className="action-button" onClick={handleTranslate}>
                翻译
              </button>
            )}
            <button className="action-button" onClick={handleClose}>
              关闭
            </button>
          </div>

          {content && (
            <>
              {isLoading && (
                <div className="loading-container">
                  <div className="loading-indicator">加载中...</div>
                  <button className="abort-button" onClick={handleAbort}>
                    <StopIcon fontSize="small" /> 中止
                  </button>
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
              >
                {content}
              </ReactMarkdown>
            </>
          )}
        </Paper>
      </Popper>
    </div>
  );
}
