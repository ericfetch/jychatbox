import React, { useState, useLayoutEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import useAppear from '../../Hooks/useAppear';
import './index.css';

interface AITextShowProps {
  content: string;
  searchText?: string;
}

function AITextShow({ content, searchText }: AITextShowProps) {
  const [ref, isAppear] = useAppear({ once: false });
  // 使用 useRef 来存储最大高度
  const maxHeightRef = useRef<number | undefined>(undefined);
  // 使用状态触发重新渲染
  const [, forceUpdate] = useState({});

  // 使用 useLayoutEffect 确保在浏览器绘制前获取高度
  useLayoutEffect(() => {
    if (isAppear && ref.current) {
      // 使用 requestAnimationFrame 确保在下一帧获取高度
      requestAnimationFrame(() => {
        const currentHeight = ref.current.scrollHeight;

        // 只在高度变大时更新最大高度
        if (
          maxHeightRef.current === undefined ||
          currentHeight > maxHeightRef.current
        ) {
          maxHeightRef.current = currentHeight;
          // 触发重新渲染
          forceUpdate({});
        }
      });
    }
  }, [isAppear, content]);

  // 高亮文本的函数
  const highlightText = (text: string) => {
    if (!searchText || !text) return text;

    const regex = new RegExp(
      `(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi',
    );

    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.toLowerCase() === searchText.toLowerCase()) {
        return (
          <span key={i} className="search-highlight">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // 创建一个通用的高亮包装函数
  const withHighlight = (Component: React.ElementType) => {
    return function ({ children, ...props }: { children: React.ReactNode }) {
      return (
        <Component {...props}>
          {React.Children.map(children, (child) =>
            typeof child === 'string' ? highlightText(child) : child,
          )}
        </Component>
      );
    };
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
          {highlightText(String(children))}
        </code>
      );
    },
    p: withHighlight('p'),
    li: withHighlight('li'),
    h1: withHighlight('h1'),
    h2: withHighlight('h2'),
    h3: withHighlight('h3'),
    h4: withHighlight('h4'),
    strong: withHighlight('strong'),
    em: withHighlight('em'),
    a({ children, href, ...props }) {
      return (
        <a href={href} {...props}>
          {React.Children.map(children, (child) =>
            typeof child === 'string' ? highlightText(child) : child,
          )}
        </a>
      );
    },
  };

  return (
    <div
      ref={ref}
      // 使用记录的最大高度，保持稳定
      style={{
        height: maxHeightRef.current || 'auto',
      }}
    >
      {isAppear && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      )}
    </div>
  );
}

export default AITextShow;
