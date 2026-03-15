export interface PublishOptions {
  exchange?: string;
  routingKey?: string;
  persistent?: boolean;
}

export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  REMINDERS: 'reminders',
  ANALYTICS: 'analytics',
  DOCUMENTS: 'document_processing',
} as const;

export const EXCHANGES = {
  PLATFORM: 'platform',
} as const;
