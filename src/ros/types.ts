export interface JointStateMsg {
  name: string[];
  position: number[];
  velocity: number[];
  effort: number[];
}

export interface TFMessage {
  transforms: Array<{
    header: { frame_id: string };
    child_frame_id: string;
    transform: {
      translation: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number; w: number };
    };
  }>;
}

export interface PointCloud2Msg {
  width: number;
  height: number;
  point_step: number;
  data: Uint8Array;
  fields: Array<{ name: string; offset: number; datatype: number }>;
}
