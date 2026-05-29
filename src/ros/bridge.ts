import { FoxgloveClient } from '@foxglove/ws-protocol';
import type { Channel, SubscriptionId, MessageData, ClientChannelId, ClientChannelWithoutId } from '@foxglove/ws-protocol';
import { decodeJointState, decodeTFMessage, decodePointCloud2 } from './cdr';

type Listener<T> = (msg: T) => void;

const CDR_DECODERS: Record<string, (buf: ArrayBuffer) => unknown> = {
  'sensor_msgs/JointState': decodeJointState,
  'tf2_msgs/TFMessage': decodeTFMessage,
  'sensor_msgs/PointCloud2': decodePointCloud2,
};

class RosBridge {
  private client: InstanceType<typeof FoxgloveClient> | null = null;
  private listeners: Map<string, Set<Listener<unknown>>> = new Map();
  private topicToSubId: Map<string, SubscriptionId> = new Map();
  private subIdToTopic: Map<SubscriptionId, string> = new Map();
  private channels: Map<string, Channel> = new Map();
  private channelEncoding: Map<string, string> = new Map();  // topic → encoding
  private channelSchema: Map<string, string> = new Map();    // topic → schemaName
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Client-side publishing
  private nextClientChannelId: ClientChannelId = 1;
  private clientChannels: Map<ClientChannelId, string> = new Map(); // id → topic

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
      chs.forEach(ch => {
        this.channels.set(ch.topic, ch);
        this.channelEncoding.set(ch.topic, (ch as Channel & { encoding?: string }).encoding ?? 'json');
        this.channelSchema.set(ch.topic, ch.schemaName);
      });
      this.listeners.forEach((ls, topic) => {
        if (ls.size > 0 && !this.topicToSubId.has(topic)) {
          this._subscribe(topic);
        }
      });
    });

    client.on('message', (event: MessageData) => {
      const topic = this.subIdToTopic.get(event.subscriptionId);
      if (!topic) return;
      const encoding = this.channelEncoding.get(topic) ?? 'json';
      const schemaName = this.channelSchema.get(topic) ?? '';
      try {
        let msg: unknown;
        if (encoding === 'cdr') {
          const rawBuf = event.data as unknown as ArrayBuffer;
          const decoder = CDR_DECODERS[schemaName];
          msg = decoder ? decoder(rawBuf) : rawBuf;
        } else {
          const text = new TextDecoder().decode(event.data as unknown as ArrayBuffer);
          msg = JSON.parse(text);
        }
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
    this.channelEncoding.clear();
    this.channelSchema.clear();
    this.clientChannels.clear();
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

  /** Advertise a client-side topic for publishing. Returns the channel id. */
  advertise(topic: string, schemaName: string, encoding = 'json'): ClientChannelId {
    const ch: ClientChannelWithoutId = { topic, encoding, schemaName };
    // Register locally so we can re-advertise on reconnect
    const id = this.nextClientChannelId++;
    this.clientChannels.set(id, topic);
    if (this.client && this.status === 'connected') {
      const assignedId = this.client.advertise(ch);
      // Replace local placeholder with the real assigned id
      this.clientChannels.delete(id);
      this.clientChannels.set(assignedId, topic);
      return assignedId;
    }
    return id;
  }

  unadvertise(channelId: ClientChannelId) {
    this.clientChannels.delete(channelId);
    this.client?.unadvertise(channelId);
  }

  /** Publish a message on a previously advertised channel. */
  publish(channelId: ClientChannelId, data: Uint8Array) {
    if (!this.client || this.status !== 'connected') return;
    this.client.sendMessage(channelId, data);
  }

  /** Convenience: publish a JSON-encoded message. */
  publishJson(channelId: ClientChannelId, msg: unknown) {
    this.publish(channelId, new TextEncoder().encode(JSON.stringify(msg)));
  }
}

export const rosBridge = new RosBridge();
