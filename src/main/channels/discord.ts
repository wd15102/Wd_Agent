// ============================================================
// Discord 通道适配器
// ============================================
import { BaseChannelAdapter } from './adapter';
import {
  BaseChannelConfig,
  MessageEvent,
  InteractionEvent,
  OutboundMessage,
  ChannelStatus,
  SessionSource,
} from './types';

interface DiscordConfig extends BaseChannelConfig {
  token: string;
  appId: string;
  guildId?: string;           // 限制服务器
  prefix?: string;            // 命令前缀，默认 '!'
}

export class DiscordAdapter extends BaseChannelAdapter {
  readonly platform = 'discord';
  config: DiscordConfig;
  private ws?: WebSocket;      // Discord Gateway WebSocket
  private heartbeatInterval?: NodeJS.Timer;
  private sequence: number | null = null;
  private sessionId?: string;
  private botName?: string;
  private channels: string[] = [];
  private pendingInteractions = new Map<string, (value: InteractionEvent) => void>();

  constructor(config: DiscordConfig) {
    super();
    this.config = { prefix: '!', ...config };
  }

  async connect(): Promise<void> {
    if (!this.config.token) {
      throw new Error('Discord token 未配置');
    }

    try {
      // 1. 获取 Gateway URL
      const gatewayRes = await fetch('https://discord.com/api/v10/gateway/bot', {
        headers: { Authorization: `Bot ${this.config.token}` },
      });
      if (!gatewayRes.ok) throw new Error(`Discord API 错误: ${gatewayRes.status}`);
      const gateway = await gatewayRes.json() as { url: string };

      // 2. 连接 WebSocket
      const wsUrl = `${gateway.url}/?v=10&encoding=json`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => console.log('[Discord] WebSocket 已连接');
      this.ws.onmessage = (event) => this.handleMessage(event.data as string);
      this.ws.onclose = () => this.handleDisconnect();
      this.ws.onerror = (err) => this.emitError(new Error(`Discord WebSocket 错误: ${err.message}`));

      // 3. 等待 Hello 帧后发送 Identify
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Discord 连接超时')), 10000);
        const origHandler = this.ws!.onmessage;
        this.ws!.onmessage = (event) => {
          const data = JSON.parse(event.data as string);
          if (data.op === 10) { // Hello
            clearTimeout(timeout);
            this.startHeartbeat(data.d.heartbeat_interval);
            this.sendIdentify();
            this.ws!.onmessage = origHandler;
            resolve();
          } else {
            origHandler(event);
          }
        };
      });

      this.emitConnected();
    } catch (err) {
      this.emitError(err as Error);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.emitDisconnected();
  }

  async send(message: OutboundMessage): Promise<string> {
    if (!this.config.token || !this.ws) throw new Error('Discord 未连接');

    const body: any = {};
    if (message.text) body.content = message.text;
    if (message.embeds?.length) body.embeds = message.embeds.map(e => ({ ...e }));
    if (message.components?.length) {
      body.components = [{
        type: 1, // Action Row
        components: message.components.map(c => ({
          type: c.type === 'button' ? 2 : 3, // 2=Button, 3=Select
          label: c.label,
          style: c.style === 'danger' ? 4 : c.style === 'secondary' ? 2 : 1,
          custom_id: `wdclaw_${c.action}`,
          options: c.options?.map(o => ({ label: o.label, value: o.value })),
          disabled: c.disabled,
        })),
      }];
    }

    const res = await fetch(`https://discord.com/api/v10/channels/${message.channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord 发送失败: ${res.status} ${errText}`);
    }

    const result = await res.json() as { id: string };
    return result.id;
  }

  async editMessage(messageId: string, message: Partial<OutboundMessage>): Promise<void> {
    if (!this.config.token) throw new Error('Discord 未连接');

    const body: any = {};
    if (message.text) body.content = message.text;
    if (message.embeds) body.embeds = message.embeds;

    await fetch(`https://discord.com/api/v10/channels/${this.config.guildId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.config.token) return;
    await fetch(`https://discord.com/api/v10/channels/${this.config.guildId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${this.config.token}` },
    });
  }

  getStatus(): ChannelStatus {
    return {
      platform: this.platform,
      connected: this.isConnected,
      botName: this.botName,
      channels: this.channels,
    };
  }

  // ---- 内部方法 ----

  private sendIdentify(): void {
    this.ws?.send(JSON.stringify({
      op: 2, // Identify
      d: {
        token: this.config.token,
        intents: 1 << 9 | 1 << 15, // MESSAGE_CONTENT + GUILD_MESSAGES
        properties: {
          os: 'windows',
          browser: 'WdClaw',
          device: 'WdClaw',
        },
      },
    }));
  }

  private startHeartbeat(interval: number): void {
    this.heartbeatInterval = setInterval(() => {
      this.ws?.send(JSON.stringify({ op: 1, d: this.sequence }));
    }, interval);
  }

  private async handleMessage(raw: string): Promise<void> {
    const data = JSON.parse(raw);
    this.sequence = data.s ?? this.sequence;

    switch (data.t) {
      case 'READY':
        this.botName = data.d.user?.username;
        this.sessionId = data.d.session_id;
        this.channels = data.d.guilds?.map((g: any) => g.id) || [];
        console.log(`[Discord] 已登录: ${this.botName}`);
        break;

      case 'MESSAGE_CREATE':
        await this.handleIncomingMessage(data.d);
        break;

      case 'INTERACTION_CREATE':
        this.handleInteraction(data.d);
        break;

      case 'HELLO':
        // 已在 connect 中处理
        break;

      default:
        // 其他事件忽略
        break;
    }
  }

  private async handleIncomingMessage(msg: any): Promise<void> {
    // 忽略 Bot 自己的消息
    if (msg.author?.bot) return;

    // 检查是否 @了 Bot
    const mentionsBot = msg.mentions?.some((m: any) => m.id === this.sessionId) ||
                        msg.content?.includes(`<@${this.config.appId}>`);

    // 检查前缀
    const prefix = this.config.prefix || '!';
    let text = msg.content || '';
    if (!mentionsBot && text.startsWith(prefix)) {
      text = text.slice(prefix.length).trim();
    } else if (!mentionsBot && this.config.prefix) {
      return; // 无前缀且未 @，忽略
    }

    const source: SessionSource = {
      platform: this.platform,
      channelId: msg.channel_id,
      userId: msg.author?.id || 'unknown',
      userName: msg.author?.username || 'Unknown',
      threadId: msg.thread?.id,
    };

    const event: MessageEvent = {
      id: msg.id,
      source,
      text,
      mentionsBot,
      attachments: msg.attachments?.map((a: any) => ({
        filename: a.filename,
        mimeType: a.content_type || 'application/octet-stream',
        size: a.size,
        url: a.url,
      })),
      timestamp: Date.now(),
    };

    this.emitMessage(event);
  }

  private handleInteraction(interaction: any): void {
    if (!interaction.data?.custom_id?.startsWith('wdclaw_')) return;

    const action = interaction.data.custom_id.replace('wdclaw_', '');

    const source: SessionSource = {
      platform: this.platform,
      channelId: interaction.channel_id || interaction.message?.channel_id || '',
      userId: interaction.member?.user?.id || interaction.user?.id || 'unknown',
      userName: interaction.member?.user?.username || interaction.user?.username || 'Unknown',
    };

    const event: InteractionEvent = {
      id: interaction.id,
      source,
      action,
      value: interaction.data.values?.[0] || '',
      messageId: interaction.message?.id || '',
    };

    // 先回应 Discord（必须在 3 秒内）
    this.respondToInteraction(interaction.id, interaction.token).catch(console.error);

    this.emitInteraction(event);
  }

  private async respondToInteraction(interactionId: string, token: string): Promise<void> {
    await fetch(`https://discord.com/api/v10/interactions/${interactionId}/${token}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 6 }), // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    });
  }

  private handleDisconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    this.emitDisconnected();
    // TODO: 自动重连逻辑
  }
}
