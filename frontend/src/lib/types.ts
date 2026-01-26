export type Visibility = 'PUBLIC' | 'PRIVATE';

export interface Command {
  id: string;
  title?: string | null;
  text: string;
  description?: string | null;
  platform: string;
  visibility: Visibility;
  favorite: boolean;
  usage_count: number;
  tags: string[];
  created_at: string;
}

export interface LearnedCommand {
  id: string;
  content: string;
  os?: string | null;
  pwd?: string | null;
  ls_output?: string | null;
  usage_count: number;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
