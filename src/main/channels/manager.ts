// ============================================================
// 通道管理器 — 统一管理所有消息通道
// ============================================
import { BaseChannelAdapter } from './adapter';
import { MessageEvent, InteractionEvent, OutboundMessage, ChannelStatus } from './types';

export class ChannelManager {
  private adapters = new Map<string, BaseChannelAdapter>();
  private messageHandler?: (event: MessageEvent, adapter: BaseChannelAdapter) => void;
  private interactionHandler?: (event: InteractionEvent, adapter: BaseChannelAdapter) => void;

  /** 注册通道适配器 */
  register(adapter: BaseChannelAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      console.warn(`[ChannelManager] ${adapter.platform} 已注册，跳过`);
      return;
    }

    // 转发事件
    adapter.on('message', (event: MessageEvent) => {
      this.messageHandler?.(event, adapter);
    });
    adapter.on('interaction', (event: InteractionEvent) => {
      this.interactionHandler?.(event, adapter);
    });
    adapter.on('error', (err: Error) => {
      console.error(`[ChannelManager] ${adapter.platform} 错误:`, err.message);
    });

    this.adapters.set(adapter.platform, adapter);
    console.log(`[ChannelManager] 已注册 ${adapter.platform} 适配器`);
  }

  /** 获取适配器 */
  get(platform: string): BaseChannelAdapter | undefined {
    return this.adapters.get(platform);
  }

  /** 获取所有适配器 */
  getAll(): BaseChannelAdapter[] {
    return Array.from(this.adapters.values());
  }

  /** 获取所有状态 */
  getStatuses(): ChannelStatus[] {
    return this.getAll().map(a => a.getStatus());
  }

  /** 设置消息处理器 */
  onMessage(handler: (event: MessageEvent, adapter: BaseChannelAdapter) => void): void {
    this.messageHandler = handler;
  }

  /** 设置交互处理器 */
  onInteraction(handler: (event: InteractionEvent, adapter: BaseChannelAdapter) => void): void {
    this.interactionHandler = handler;
  }

  /** 连接所有已注册通道 */
  async connectAll(): Promise<void> {
    const results = await Promise.allSettled(
      this.getAll().map(async adapter => {
        if (adapter.config.enabled !== false) {
          await adapter.connect();
        }
      })
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[ChannelManager] 连接完成: ${succeeded} 成功, ${failed} 失败`);
  }

  /** 断开所有通道 */
  async disconnectAll(): Promise<void> {
    await Promise.allSettled(
      this.getAll().map(a => a.disconnect().catch(() => {}))
    );
    console.log('[ChannelManager] 所有通道已断开');
  }

  /** 发送消息到指定平台 */
  async send(platform: string, message: OutboundMessage): Promise<string | null> {
    const adapter = this.adapters.get(platform);
    if (!adapter || !adapter.isConnected) {
      console.warn(`[ChannelManager] ${platform} 未连接`);
      return null;
    }
    return await adapter.send(message);
  }

  /** 广播到所有已连接平台 */
  async broadcast(message: OutboundMessage): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    for (const [platform, adapter] of this.adapters) {
      if (adapter.isConnected) {
        try {
          const id = await adapter.send(message);
          results.set(platform, id);
        } catch {
          results.set(platform, null);
        }
      }
    }
    return results;
  }
}

// 单例
export const channelManager = new ChannelManager();
