import { FoxgloveClient } from '@foxglove/ws-protocol';
import type { Channel, SubscriptionId, MessageData } from '@foxglove/ws-protocol';

type Listener<T> = (msg: T) => void;

class RosBridge {
  private client: InstanceType<typeof FoxgloveClient> | null = null;
  private listeners: Map<string, Set<Listener<unknown>>> = new Map();
  private topicToSubId: Map<string, SubscriptionId> = new Map();
  private subIdToTopic: Map<SubscriptionId, string> = new Map();
  private channels: Map<string, Channel> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  url = '';
  status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  onStatusChange?: (s: string) => void;

  connect(url: string) {
    this.url = url;
    this._connect();
  }

  private _connect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.status = 'connecting';
    this.onStatusChange?.(this.status);

    const ws = new WebSocket(this.url);
    const client = new FoxgloveClient({ ws: ws as never });
    this.client = client;

    client.on('open', () => {
      this.status = 'connected';
      this.onStatusChange?.(this.status);
    });

    client.on('advertise', (chs: Channel[]) => {
      chs.forEach(ch => this.channels.set(ch.topic, ch));
      this.listeners.forEach((ls, topic) => {
        if (ls.size > 0 && !this.topicToSubId.has(topic)) {
          this._subscribe(topic);
        }
      });
    });

    client.on('message', (event: MessageData) => {
      const topic = this.subIdToTopic.get(event.subscriptionId);
      if (!topic) return;
      try {
        const text = new TextDecoder().decode(event.data as unknown as ArrayBuffer);
        const msg = JSON.parse(text);
        this.listeners.get(topic)?.forEach(l => l(msg));
      } catch {
        this.listeners.get(topic)?.forEach(l => l(event.data as unknown));
      }
    });

    client.on('error', () => {
      this.status = 'error';
      this.onStatusChange?.(this.status);
      this.reconnectTimer = setTimeout(() => this._connect(), 3000);
    });

    client.on('close', () => {
      this.status = 'disconnected';
      this.onStatusChange?.(this.status);
    });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.client?.close();
    this.client = null;
    this.topicToSubId.clear();
    this.subIdToTopic.clear();
    this.channels.clear();
    this.status = 'disconnected';
    this.onStatusChange?.(this.status);
  }

  subscribe<T>(topic: string, listener: Listener<T>) {
    if (!this.listeners.has(topic)) this.listeners.set(topic, new Set());
    this.listeners.get(topic)!.add(listener as Listener<unknown>);
    if (this.status === 'connected' && !this.topicToSubId.has(topic)) {
      this._subscribe(topic);
    }
  }

  unsubscribe<T>(topic: string, listener: Listener<T>) {
    this.listeners.get(topic)?.delete(listener as Listener<unknown>);
  }

  private _subscribe(topic: string) {
    const ch = this.channels.get(topic);
    if (!ch || !this.client) return;
    const subId = this.client.subscribe(ch.id);
    this.topicToSubId.set(topic, subId);
    this.subIdToTopic.set(subId, topic);
  }
}

export const rosBridge = new RosBridge();
