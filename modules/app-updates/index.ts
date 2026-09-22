export type AppUpdatesModule = {
  getStoreEnvironmentAsync(): Promise<'production' | 'nonproduction' | 'unknown'>;
  getPlayUpdateAsync(): Promise<number | null>;
};

const unavailable: AppUpdatesModule = {
  async getStoreEnvironmentAsync() { return 'unknown'; },
  async getPlayUpdateAsync() { return null; },
};

export default unavailable;
