export type NodeType = 'client' | 'server' | 'database' | 'gateway' | 'cache' | 'queue' | 'cloud';

export type NodeStatus = 'PROPOSED' | 'COMMITTED';

export interface Position {
  x: number;
  y: number;
}

export interface SystemNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  status: NodeStatus;
  position: Position;
}

export interface SystemEdge {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  status: NodeStatus;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  isToolCall?: boolean;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: any;
}

export interface Proposal {
  type: 'node' | 'connection';
  data: any; // Raw args from Gemini
}
