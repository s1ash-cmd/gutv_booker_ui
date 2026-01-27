import { TelegramClient } from '../client';

export interface ICommand {
  name: string;
  executeAsync(client: TelegramClient, message: any): Promise<void>;
}