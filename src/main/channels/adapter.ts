// ============================================================
// 消息通道适配器 — 抽象基类
// ============================================
import { EventEmitter } from 'events';
import {
  SessionSource,
  MessageEvent,
  InteractionEvent,
  OutboundMessage,
  ChannelStatus,
  BaseChannelConfig,
} from './types';

export abstract class BaseChannelAdapter extends EventEmitter {
  abstract readonly platform: string;
  abstract config: BaseChannelConfig;
  protected _connected = false;

  /** 连接到平台 */
  abstract connect(): Promise<void>;

  /** 断开连接 */
  abstract disconnect(): Promise<void>;

  /** 发送消息到平台 */
  abstract send(message: OutboundMessage): Promise<string>; // 返回消息 ID

  /** 更新已发送消息 */
  abstract editMessage(messageId: string, message: Partial<OutboundMessage>): Promise<void>;

  /** 删除消息 */
  abstract deleteMessage(messageId: string): Promise<void>;

  /** 获取通道状态 */
  abstract getStatus(): ChannelStatus;

  /** 是否已连接 */
  get isConnected(): boolean {
    return this._connected;
  }

  // ---- 事件发射 ----

  emitMessage(event: MessageEvent): void {
    this.emit('message', event);
  }

  emitInteraction(event: InteractionEvent): void {
    this.emit('interaction', event);
  }

  emitError(error: Error): void {
    this.emit('error', error);
  }

  emitConnected(): void {
    this._connected = true;
    this.emit('connected');
  }

  emitDisconnected(): void {
    this._connected = false;
    this.emit('disconnected');
  }

  // ---- 通用工具方法 ----

  /** 生成唯一 ID */
  protected generateId(): string {
    return `${this.platform}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /** 截断文本到平台限制 */
  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  /** 转义 Markdown 特殊字符 */
  protected escapeMarkdown(text: string): string {
    return text.replace(/[*_~`]/g, '\\$&');
  }
}
