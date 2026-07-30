// ============================================================
// 消息通道类型定义
// ============================================

/** 消息来源身份 */
export interface SessionSource {
  platform: string;          // 'discord' | 'feishu' | 'wecom' | 'telegram'
  channelId: string;         // 频道/群组 ID
  userId: string;            // 发送者 ID
  userName: string;          // 发送者名称
  threadId?: string;         // 线程 ID（支持线程式平台）
}

/** 收到的消息事件 */
export interface MessageEvent {
  id: string;                // 消息唯一 ID
  source: SessionSource;
  text: string;              // 消息文本内容
  mentionsBot: boolean;      // 是否 @了 Bot
  attachments?: Attachment[];
  replyTo?: string;          // 回复的消息 ID
  timestamp: number;
}

/** 附件 */
export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  url?: string;              // 远程 URL
  localPath?: string;        // 本地缓存路径
}

/** 交互事件（按钮点击/菜单选择） */
export interface InteractionEvent {
  id: string;
  source: SessionSource;
  action: string;            // 'approve' | 'deny' | 'select'
  value: string;             // 交互值（如 toolCallId）
  messageId: string;         // 关联的消息 ID
}

/** 要发送的消息 */
export interface OutboundMessage {
  channelId: string;
  text?: string;
  embeds?: MessageEmbed[];
  components?: MessageComponent[];  // 按钮/菜单
  replyTo?: string;
  threadId?: string;
}

/** 富文本嵌入 */
export interface MessageEmbed {
  title?: string;
  description?: string;
  color?: number;            // 颜色整数
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
  timestamp?: number;
}

/** 消息组件（按钮/选择器） */
export interface MessageComponent {
  type: 'button' | 'select';
  label: string;
  style?: 'primary' | 'secondary' | 'danger';
  action: string;            // 交互动作标识
  options?: Array<{ label: string; value: string }>; // select 专用
  disabled?: boolean;
}

/** 通道状态 */
export interface ChannelStatus {
  platform: string;
  connected: boolean;
  botName?: string;
  channels?: string[];
  error?: string;
  latency?: number;
}

/** 通道配置基类 */
export interface BaseChannelConfig {
  enabled: boolean;
}
