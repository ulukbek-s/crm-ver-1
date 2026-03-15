import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

const QUEUE_NOTIFICATIONS = 'platform.notifications';
const QUEUE_REMINDERS = 'platform.reminders';

@Injectable()
export class QueueWorkerService implements OnModuleInit, OnModuleDestroy {
  private channel: amqp.Channel | null = null;
  private conn: amqp.Connection | null = null;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get('RABBITMQ_URL');
    if (!url) return;
    try {
      this.conn = await amqp.connect(url);
      this.channel = await this.conn.createChannel();
      await this.channel.assertQueue(QUEUE_NOTIFICATIONS, { durable: true });
      await this.channel.assertQueue(QUEUE_REMINDERS, { durable: true });
      await this.channel.consume(QUEUE_NOTIFICATIONS, (msg: amqp.ConsumeMessage | null) => this.handleNotification(msg));
      await this.channel.consume(QUEUE_REMINDERS, (msg: amqp.ConsumeMessage | null) => this.handleReminder(msg));
    } catch (e) {
      console.warn('QueueWorker: RabbitMQ not available', (e as Error).message);
    }
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.conn) await this.conn.close();
  }

  private handleNotification(msg: amqp.ConsumeMessage | null) {
    if (!msg) return;
    try {
      const body = JSON.parse(msg.content.toString());
      console.log('[Worker] Notification:', body?.type ?? body);
      this.channel?.ack(msg);
    } catch {
      this.channel?.nack(msg, false, false);
    }
  }

  private handleReminder(msg: amqp.ConsumeMessage | null) {
    if (!msg) return;
    try {
      const body = JSON.parse(msg.content.toString());
      console.log('[Worker] Reminder:', body?.type ?? body);
      this.channel?.ack(msg);
    } catch {
      this.channel?.nack(msg, false, false);
    }
  }
}
