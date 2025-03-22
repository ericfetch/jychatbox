import { AccessTimeFilledSharp, MoreHoriz } from '@mui/icons-material';
import {
  Tooltip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useState, useEffect } from 'react';
import './index.scss';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import AddChatModal from '../ChatEditModal';
import appStore from '../../utils/store';

function ChatInfoShow(props: any) {
  const {
    activeChat = {},
    onSearch,
    onClearSearch,
    onClearMessages,
    onUpdateChat,
  } = props;
  const [searchText, setSearchText] = useState('');
  // 添加菜单状态
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  // 添加对话设置弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);

  // 使用 useState 管理功能开关
  const [featureToggles, setFeatureToggles] = useState({
    dictionary: false,
    translation: false,
  });

  // 加载特定对话的功能开关
  useEffect(() => {
    if (activeChat?.id) {
      // 异步获取功能开关
      appStore
        .get(`chat_features_${activeChat.id}`)
        .then((storedToggles: any) => {
          console.log(storedToggles);
          setFeatureToggles({
            dictionary: storedToggles?.dictionary || false,
            translation: storedToggles?.translation || false,
          });
        });
    }
  }, [activeChat?.id]);

  // 处理单个功能开关的切换
  const handleFeatureToggle = (feature: 'dictionary' | 'translation') => {
    if (activeChat?.id) {
      const newToggles = {
        ...featureToggles,
        [feature]: !featureToggles[feature],
      };

      // 异步存储功能开关
      appStore.set(`chat_features_${activeChat.id}`, newToggles);
      setFeatureToggles(newToggles);
    }
  };

  // 计算总 tokens 的函数
  const calculateTotalTokens = () => {
    return (
      activeChat?.messages?.reduce((total: any, message: any) => {
        return total + (message.tokens || 0);
      }, 0) || 0
    );
  };

  const totalTokens = calculateTotalTokens();

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    // 如果搜索框被清空，触发清除搜索事件
    if (e.target.value === '') {
      onClearSearch && onClearSearch();
    }
  };

  // 处理搜索提交
  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchText.trim()) {
      onSearch(searchText);
    }
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchText('');
    onClearSearch && onClearSearch();
  };

  // 打开菜单
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 关闭菜单
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // 处理清除记录
  const handleClearMessages = () => {
    if (onClearMessages && window.confirm('确定要清除所有对话记录吗？')) {
      onClearMessages(activeChat.id);
    }
    handleMenuClose();
  };

  // 处理打开对话设置弹窗
  const handleOpenChatSettings = () => {
    handleMenuClose();
    setDialogOpen(true);
  };

  // 处理关闭对话设置弹窗
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // 处理更新对话设置
  const handleUpdateChat = (updatedChat: any) => {
    if (onUpdateChat) {
      onUpdateChat(updatedChat);
    }
    setDialogOpen(false);
  };

  // 处理删除当前对话
  const handleDeleteChat = () => {
    if (activeChat?.id && window.confirm('确定要删除当前对话吗？')) {
      appStore.chat.removeChat(activeChat.id);
      window.location.reload();
    }
  };

  // 处理导出今天的对话记录(DOCX格式)
  const handleExportTodayMessages = () => {
    if (activeChat?.messages?.length) {
      // 获取今天的日期（只包含年-月-日）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 筛选今天的消息
      const todayMessages = activeChat.messages.filter((message: any) => {
        const messageDate = new Date(message.timestamp || message.date || Date.now());
        return messageDate >= today;
      });
      
      if (todayMessages.length === 0) {
        alert('今天没有对话记录');
        return;
      }
      
      // 创建DOCX文档
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: activeChat.title || '对话记录',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                text: `导出时间: ${new Date().toLocaleString()}`,
                spacing: {
                  after: 200,
                },
              }),
              ...todayMessages.flatMap((msg: any) => [
                new Paragraph({
                  text: `${msg.role === 'user' ? '我' : 'AI'}:`,
                  heading: HeadingLevel.HEADING_3,
                  spacing: {
                    before: 200,
                  },
                }),
                ...msg.content.split(/(?<=[.。:！？…])/).map((text: string) => {
                  return new Paragraph({
                    text,
                    spacing: {
                      after: 200,
                    },
                  });
                }),
              ]),
            ],
          },
        ],
      });
      
      // 生成并下载文件
      Packer.toBlob(doc).then(blob => {
        const exportFileName = `${activeChat.title || '对话记录'}_${new Date().toISOString().split('T')[0]}.docx`;
        saveAs(blob, exportFileName);
        handleMenuClose();
      });
    } else {
      alert('没有可导出的对话记录');
    }
  };

  return (
    <>
      {activeChat?.id && (
        <header className="top-header">
          <div className="chat-header">
            <div className="header-left">
              <FormControlLabel
                control={<div style={{ fontSize: '14px' }}>划词功能：</div>}
                label=""
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={featureToggles.dictionary}
                    onChange={() => handleFeatureToggle('dictionary')}
                    color="primary"
                  />
                }
                label="词典"
              />

              {/* 翻译功能开关 */}
              <FormControlLabel
                style={{ fontSize: '14px' }}
                control={
                  <Switch
                    checked={featureToggles.translation}
                    onChange={() => handleFeatureToggle('translation')}
                    color="primary"
                  />
                }
                label="翻译"
              />
            </div>
            <div className="header-right">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="搜索记录"
                  className="search-input"
                  value={searchText}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchSubmit}
                />
                {searchText && (
                  <button
                    className="clear-search-btn"
                    onClick={handleClearSearch}
                  >
                    ×
                  </button>
                )}
              </div>
              {/* <AccessTimeFilledSharp style={{ color: '#718096' }} /> */}
              <MoreHoriz
                style={{ color: '#718096', cursor: 'pointer' }}
                onClick={handleMenuOpen}
              />
              {/* 添加操作菜单 */}
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem onClick={handleClearMessages}>清除对话记录</MenuItem>
                <MenuItem onClick={handleOpenChatSettings}>
                  修改对话设置
                </MenuItem>
                <MenuItem onClick={handleDeleteChat}>删除当前对话</MenuItem>
                <MenuItem onClick={handleExportTodayMessages}>
                  导出今日记录
                </MenuItem>
              </Menu>
            </div>
          </div>
          <div className="chat-info-section">
            <span className="chat-tip text-muted small">
              {activeChat?.modelType}
            </span>

            {activeChat?.appId && (
              <Tooltip title={activeChat.appId} arrow>
                <span className="chat-tip text-muted small">
                  📚 {activeChat.appId.substring(0, 20)}...
                </span>
              </Tooltip>
            )}
            {activeChat?.apiKey && (
              <Tooltip title={activeChat.apiKey} arrow>
                <span className="chat-tip text-muted small">
                  🔑 {activeChat.apiKey.substring(0, 20)}...
                </span>
              </Tooltip>
            )}
            {activeChat?.aiRole && (
              <Tooltip title={activeChat.aiRole} arrow>
                <span className="chat-tip text-muted small">
                  🤖 {activeChat.aiRole.substring(0, 20)}...
                </span>
              </Tooltip>
            )}
            <span className="chat-tip text-muted small">
              {activeChat?.messages?.length}条记录 (共 {totalTokens} Tokens)
            </span>
          </div>
        </header>
      )}

      {/* 添加对话设置弹窗 */}
      {dialogOpen && (
        <AddChatModal
          visible={dialogOpen}
          onClose={handleCloseDialog}
          chatData={activeChat}
          onUpdate={handleUpdateChat}
        />
      )}
    </>
  );
}

export default ChatInfoShow;
