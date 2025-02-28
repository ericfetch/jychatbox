interface AIModelConfig {
  id: string;
  name: string;
  apiKey: string;
  appId: string;
  baseUrl: string;
  modelType: string;
  subModel?: string;
  isActive: boolean;
}

export default class ConfigStore {
  private store: any;

  private configs: AIModelConfig[] = [];

  constructor(store: any) {
    this.store = store;
    this.loadConfigs();
  }

  async loadConfigs() {
    this.configs = await this.store.get('aiModelConfigs');
  }

  getConfigs() {
    return this.configs;
  }

  getConfigById(id: string) {
    return this.configs.find((config) => config.id === id);
  }
}
