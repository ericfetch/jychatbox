import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames';
import './index.scss';

/* eslint-disable react/function-component-definition */
const Text: React.FC<any> = ({
  className,
  disabled = false,
  maxLength,
  placeholder,
  onChange,
  onSubmit,
  value: valueProp,
}: any) => {
  const [value, setValue] = useState(valueProp || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.value = valueProp;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 40)}px`;
    }
  }, [valueProp]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // 处理最大长度限制
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    setValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 支持 Cmd/Ctrl + Enter 提交
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      onSubmit?.(value);
    }
  };

  const textClassName = classNames('text-input', {
    'text-input--disabled': disabled,
    [className || '']: !!className,
  });

  return (
    <textarea
      ref={textareaRef}
      className={textClassName}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
};

export default Text;
