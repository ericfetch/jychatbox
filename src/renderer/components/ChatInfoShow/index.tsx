import { AccessTimeFilledSharp, MoreHoriz } from '@mui/icons-material';
import { Tooltip, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import './index.scss';
import AddChatModal from '../ChatEditModal';

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

  return (
    <>
      {activeChat?.id && (
        <header className="top-header">
          <div className="chat-header">
            <div className="header-left">
              <h2>{activeChat?.title}</h2>
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
              <AccessTimeFilledSharp style={{ color: '#718096' }} />
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
