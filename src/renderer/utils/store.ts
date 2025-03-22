import ChatStore from './chatStore';
import ConfigStore from './configStore';

class AppStore {
  private store: any;

  public chat: ChatStore;

  public config: ConfigStore;

  public constructor() {
    this.store = window.electronStore;
    this.chat = new ChatStore(this.store);
    this.config = new ConfigStore(this.store);
  }

  public get(key: string) {
    return this.store.get(key);
  }

  public set(key: string, value: any) {
    this.store.set(key, value);
  }
}

const appStore = new AppStore();

export default appStore;
