export interface RosHeader {
  stamp: { sec: number; nanosec: number };
  frame_id: string;
}

export interface JointStateMsg {
  header?: RosHeader;
  name: string[];
  position: number[];
  velocity: number[];
  effort: number[];
}

export interface PointCloud2Field {
  name: string;
  offset: number;
  datatype: number; // 7 = float32
  count: number;
}

export interface PointCloud2Msg {
  header?: RosHeader;
  height: number;
  width: number;
  fields: PointCloud2Field[];
  is_bigendian: boolean;
  point_step: number;
  row_step: number;
  /** Raw binary as Uint8Array (CDR) or base64 string (JSON encoding) */
  data: Uint8Array | string;
  is_dense: boolean;
}

export interface TFTransform {
  header: RosHeader;
  child_frame_id: string;
  transform: {
    translation: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  };
}

export interface TFMessage {
  transforms: TFTransform[];
}
