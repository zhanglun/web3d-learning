/**
 * Minimal CDR (Common Data Representation) decoder for ROS2 messages.
 * CDR layout: 4-byte header [0x00, endian, 0x00, 0x00] followed by payload.
 * All fields are aligned to their natural size.
 */

export class CdrReader {
  private view: DataView;
  private offset = 4; // skip 4-byte CDR header
  private le: boolean;

  constructor(buf: ArrayBuffer) {
    this.view = new DataView(buf);
    // byte 1: 0x00 = big-endian, 0x01 = little-endian
    this.le = this.view.byteLength > 1 && this.view.getUint8(1) === 0x01;
  }

  private align(n: number) {
    const rem = this.offset % n;
    if (rem !== 0) this.offset += n - rem;
  }

  readUint8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  readInt32(): number {
    this.align(4);
    const v = this.view.getInt32(this.offset, this.le);
    this.offset += 4;
    return v;
  }

  readUint32(): number {
    this.align(4);
    const v = this.view.getUint32(this.offset, this.le);
    this.offset += 4;
    return v;
  }

  readFloat32(): number {
    this.align(4);
    const v = this.view.getFloat32(this.offset, this.le);
    this.offset += 4;
    return v;
  }

  readFloat64(): number {
    this.align(8);
    const v = this.view.getFloat64(this.offset, this.le);
    this.offset += 8;
    return v;
  }

  readString(): string {
    const len = this.readUint32(); // includes null terminator
    if (len === 0) return '';
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len - 1);
    this.offset += len;
    return new TextDecoder().decode(bytes);
  }

  readStringArray(): string[] {
    const count = this.readUint32();
    const arr: string[] = [];
    for (let i = 0; i < count; i++) arr.push(this.readString());
    return arr;
  }

  readFloat64Array(): number[] {
    const count = this.readUint32();
    const arr: number[] = [];
    for (let i = 0; i < count; i++) arr.push(this.readFloat64());
    return arr;
  }

  readUint8Array(): Uint8Array {
    const count = this.readUint32();
    const arr = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, count);
    this.offset += count;
    return arr;
  }
}

// ── ROS2 message decoders ────────────────────────────────────────────────────

import type { JointStateMsg, PointCloud2Msg, TFMessage } from './types';

export function decodeJointState(buf: ArrayBuffer): JointStateMsg {
  const r = new CdrReader(buf);
  // Header
  const sec = r.readInt32();
  const nanosec = r.readUint32();
  const frame_id = r.readString();
  const name = r.readStringArray();
  const position = r.readFloat64Array();
  const velocity = r.readFloat64Array();
  const effort = r.readFloat64Array();
  return { header: { stamp: { sec, nanosec }, frame_id }, name, position, velocity, effort };
}

export function decodeTFMessage(buf: ArrayBuffer): TFMessage {
  const r = new CdrReader(buf);
  const count = r.readUint32();
  const transforms = [];
  for (let i = 0; i < count; i++) {
    const sec = r.readInt32();
    const nanosec = r.readUint32();
    const frame_id = r.readString();
    const child_frame_id = r.readString();
    const tx = r.readFloat64();
    const ty = r.readFloat64();
    const tz = r.readFloat64();
    const rx = r.readFloat64();
    const ry = r.readFloat64();
    const rz = r.readFloat64();
    const rw = r.readFloat64();
    transforms.push({
      header: { stamp: { sec, nanosec }, frame_id },
      child_frame_id,
      transform: { translation: { x: tx, y: ty, z: tz }, rotation: { x: rx, y: ry, z: rz, w: rw } },
    });
  }
  return { transforms };
}

export function decodePointCloud2(buf: ArrayBuffer): PointCloud2Msg {
  const r = new CdrReader(buf);
  const sec = r.readInt32();
  const nanosec = r.readUint32();
  const frame_id = r.readString();
  const height = r.readUint32();
  const width = r.readUint32();
  const fieldCount = r.readUint32();
  const fields = [];
  for (let i = 0; i < fieldCount; i++) {
    const name = r.readString();
    const offset = r.readUint32();
    const datatype = r.readUint8();
    const count = r.readUint32();
    fields.push({ name, offset, datatype, count });
  }
  const is_bigendian = r.readUint8() !== 0;
  const point_step = r.readUint32();
  const row_step = r.readUint32();
  const data = r.readUint8Array();
  const is_dense = r.readUint8() !== 0;
  return {
    header: { stamp: { sec, nanosec }, frame_id },
    height, width, fields, is_bigendian, point_step, row_step, data, is_dense,
  };
}

// ── CDR encoder for JointState (client → server publishing) ─────────────────

export function encodeJointState(msg: JointStateMsg): Uint8Array {
  // Estimate buffer size and use a resizable approach via DataView
  const nameBytes = msg.name.map(n => new TextEncoder().encode(n + '\0'));
  const totalNameBytes = nameBytes.reduce((s, b) => s + 4 + b.length, 0);
  const floatBytes = (msg.position.length + msg.velocity.length + msg.effort.length) * 8;
  // header: 4(sec)+4(nanosec)+4+frame_id_bytes
  const frameIdBytes = new TextEncoder().encode('\0'); // empty frame_id
  const size = 4 + 4 + 4 + 4 + frameIdBytes.length + 4 + totalNameBytes + 3 * 4 + floatBytes + 64;
  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);
  let off = 0;

  // CDR header: little-endian
  view.setUint8(0, 0x00); view.setUint8(1, 0x01); view.setUint8(2, 0x00); view.setUint8(3, 0x00);
  off = 4;

  const align = (n: number) => { const r = off % n; if (r) off += n - r; };

  const writeUint32 = (v: number) => { align(4); view.setUint32(off, v, true); off += 4; };
  const writeInt32 = (v: number) => { align(4); view.setInt32(off, v, true); off += 4; };
  const writeFloat64 = (v: number) => { align(8); view.setFloat64(off, v, true); off += 8; };
  const writeString = (s: string) => {
    const bytes = new TextEncoder().encode(s + '\0');
    writeUint32(bytes.length);
    new Uint8Array(buf, off, bytes.length).set(bytes);
    off += bytes.length;
  };

  // header.stamp
  writeInt32(Math.floor(Date.now() / 1000));
  writeUint32(0);
  writeString('');

  // name[]
  writeUint32(msg.name.length);
  msg.name.forEach(n => writeString(n));

  // position[]
  writeUint32(msg.position.length);
  msg.position.forEach(v => writeFloat64(v));

  // velocity[]
  writeUint32(msg.velocity.length);
  msg.velocity.forEach(v => writeFloat64(v));

  // effort[]
  writeUint32(msg.effort.length);
  msg.effort.forEach(v => writeFloat64(v));

  return new Uint8Array(buf, 0, off);
}
