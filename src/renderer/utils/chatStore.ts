import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokens?: number;
}

export interface Chat {
  id: string;
  title: string;
  modelType: string;
  modelId: string;
  createdAt: number;
  messages: Message[];
  appId?: string;
  apiKey?: string;
  aiRole?: string;
}

class ChatStore {
  private static DEFAULT_MODEL = 'gpt-3.5-turbo';

  private store: any;

  private chats: Chat[] = [];

  private activeChat: Chat | null = null;

  private activeChatChangeCallbacks: ((chat: Chat) => void)[] = [];

  constructor(store: any) {
    this.store = store;
    this.loadChats();
  }

  async loadChats() {
    this.chats = (await this.store.get('chat.chats')) || [];
    this.setActiveChat(this.chats[0]);
  }

  getChats(): Chat[] {
    return this.chats;
  }

  getActiveChat(): Chat | null {
    return this.activeChat;
  }

  setActiveChat(chat: Chat) {
    this.activeChat = chat;
    this.activeChatChangeCallbacks.forEach((callback) => callback(chat));
  }

  onActiveChatChange(callback: (chat: Chat) => void) {
    this.activeChatChangeCallbacks.push(callback);
  }

  async addChat(chat: Partial<Chat> = {}): Promise<Chat> {
    const newChat: Chat = {
      id: uuidv4(),
      title: chat.title || '新对话',
      modelType: chat.modelType || 'gpt-3.5-turbo',
      modelId: chat.modelId || '',
      createdAt: Date.now(),
      messages: chat.messages || [],
      apiKey: chat.apiKey || '',
      appId: chat.appId || '',
      aiRole: chat.aiRole || '',
    };
    this.chats.push(newChat);
    await this.store.set('chat.chats', this.chats);
    return newChat;
  }

  removeChat(chatId: string): void {
    const chats = this.getChats().filter((chat) => chat.id !== chatId);
    this.store.set('chat.chats', chats);
    this.chats = chats;
  }

  updateChat(chatId: string, updates: Partial<Chat>): void {
    const chats = this.getChats().map((chat) =>
      chat.id === chatId ? { ...chat, ...updates } : chat,
    );
    this.store.set('chat.chats', chats);
  }

  clearChats(): void {
    this.chats = [];
    this.setActiveChat({} as Chat);
    this.store.set('chat.chats', []);
  }

  pushMessage(message: Message): void {
    if (!this.activeChat) return;
    this.activeChat.messages.push(message);
    this.setActiveChat(this.activeChat);
    this.updateChat(this.activeChat.id, this.activeChat);
  }

  clearMessages(chatId: string): void {
    const chat = this.getChats().find((chat) => chat.id === chatId);
    if (chat) {
      chat.messages = [];
      this.setActiveChat(chat);
      this.updateChat(chatId, chat);
    }
  }
}

export default ChatStore;
