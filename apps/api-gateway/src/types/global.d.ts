declare module 'amqplib' {
  export interface ConsumeMessage {
    content: Buffer;
    fields: object;
    properties: object;
  }
  export interface Channel {
    assertQueue(q: string, opts?: object): Promise<object>;
    consume(q: string, cb: (msg: ConsumeMessage | null) => void): Promise<object>;
    ack(msg: ConsumeMessage): void;
    nack(msg: ConsumeMessage, all?: boolean, requeue?: boolean): void;
    close(): Promise<void>;
  }
  export interface Connection {
    createChannel(): Promise<Channel>;
    close(): Promise<void>;
  }
  export function connect(url: string): Promise<Connection>;
}
