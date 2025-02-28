/* eslint-disable jsx-a11y/anchor-is-valid */
import { useEffect, useState } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { ChatBubbleOutlineOutlined } from '@mui/icons-material';
import classNames from 'classnames';
import AddChatModal from './components/ChatEditModal';
import store from './utils/store';
import { Chat } from './utils/chatStore';
import ChatPage from './pages/chat';

import './App.css';
import ChatInfoShow from './components/ChatInfoShow';
import ConfigCenter from './pages/configCenter';

function MainLayout() {
  const [showAddChatModal, setShowAddChatModal] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>({
    id: '',
    title: '',
    modelType: '',
    modelId: '',
    createdAt: 0,
    messages: [],
  });
  const [movingChatId, setMovingChatId] = useState<string | null>(null);
  const [openClearDialog, setOpenClearDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveChat(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    store.chat.onActiveChatChange((chat) => {
      setActiveChat(chat);
    });
    const arr = store.chat.getChats();
    setChats(arr);
    return () => {};
  }, []);

  const handleChatClick = (chat: Chat) => {
    setActiveChat(chat);
    navigate('/');
    setTimeout(() => {
      store.chat.setActiveChat(chat);
    }, 100);
  };

  const handleClearChat = () => {
    store.chat.clearChats();
    setOpenClearDialog(false);
  };

  const handleOpenClearDialog = () => {
    setOpenClearDialog(true);
  };

  const handleCloseClearDialog = () => {
    setOpenClearDialog(false);
  };

  const handleDeleteChat = (chatId: string) => {
    store.chat.removeChat(chatId);
    setChats(store.chat.getChats());
  };

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-text">JY CHATBOX</div>
          <span className="clear-chat-btn" onClick={handleOpenClearDialog}>
            🗑️
          </span>
        </div>

        <nav className="nav-menu">
          <div className="nav-section chat-list">
            {store.chat.getChats().map((chat, index) => (
              <div
                className={classNames('nav-item chat-item', {
                  active: chat.id === activeChat?.id,
                  'current-chat': chat.id === activeChat?.id,
                })}
                key={chat.id}
                onClick={() => handleChatClick(chat)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="chat-item-title">
                  <ChatBubbleOutlineOutlined />
                  <span style={{ marginTop: '-4px' }}> {chat.title}</span>
                </span>
                <span
                  className="chat-item-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                >
                  🗑️
                </span>
              </div>
            ))}
          </div>
        </nav>
        <div className="user-profile" onClick={() => setShowAddChatModal(true)}>
          <span className="icon">🆕</span>
          <span className="name">新建对话</span>
        </div>
        <div className="user-profile">
          <span className="settings-icon">⚙️</span>
          <span className="name" onClick={() => navigate('/config')}>
            配置中心
          </span>
        </div>
      </aside>

      <main className="main-content">
        <div className="content">
          <Outlet />
        </div>
      </main>
      <AddChatModal
        visible={showAddChatModal}
        onClose={() => setShowAddChatModal(false)}
      />
      <Dialog
        open={openClearDialog}
        onClose={handleCloseClearDialog}
        aria-labelledby="clear-chat-dialog-title"
        aria-describedby="clear-chat-dialog-description"
      >
        <DialogTitle id="clear-chat-dialog-title">确认清除所有对话</DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-chat-dialog-description">
            您确定要删除所有聊天记录吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearDialog} color="primary">
            取消
          </Button>
          <Button onClick={handleClearChat} color="error" autoFocus>
            确认清除
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/config" element={<ConfigCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}
