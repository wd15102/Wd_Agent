// ============================================================
// 会话管理器
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { Session, Message } from '../../shared/types';
import { generateId, now } from '../../shared/utils';
import { SESSIONS_DIR } from '../../shared/constants';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = path.join(dataDir, SESSIONS_DIR);
  }

  async loadSessions(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        this.createDefault();
        return;
      }

      const files = fs.readdirSync(this.dataDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(this.dataDir, file), 'utf-8');
        const session = JSON.parse(raw) as Session;
        this.sessions.set(session.id, session);
      }

      if (this.sessions.size === 0) {
        this.createDefault();
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      this.createDefault();
    }
  }

  create(modelId: string, expertId?: string): Session {
    const session: Session = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: now(),
      updatedAt: now(),
      modelId,
      expertId: expertId || 'general',
    };
    this.sessions.set(session.id, session);
    this.save(session);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  list(): Session[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  }

  delete(id: string): void {
    this.sessions.delete(id);
    const filePath = path.join(this.dataDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  rename(id: string, title: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.title = title;
      this.save(session);
    }
  }

  clear(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.messages = [];
      session.title = '新对话';
      session.updatedAt = now();
      this.save(session);
    }
  }

  update(id: string, updates: Partial<Session>): void {
    const session = this.sessions.get(id);
    if (session) {
      Object.assign(session, updates);
      session.updatedAt = now();
      this.save(session);
    }
  }

  save(session: Session): void {
    session.updatedAt = now();
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    const filePath = path.join(this.dataDir, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }

  saveAllSessions(): void {
    for (const session of this.sessions.values()) {
      this.save(session);
    }
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = now();
      this.save(session);
    }
  }

  updateTitle(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.title === '新对话' && session.messages.length >= 2) {
      const firstUser = session.messages.find((m) => m.role === 'user');
      if (firstUser) {
        const contentStr = Array.isArray(firstUser.content)
          ? (firstUser.content.find((p: any) => p.type === 'text')?.text || '').slice(0, 30)
          : String(firstUser.content).slice(0, 30);
        session.title = contentStr.length >= 30 ? contentStr + '...' : contentStr;
        this.save(session);
      }
    }
  }

  private createDefault(): void {
    this.create('glm-4-flash');
  }
}
