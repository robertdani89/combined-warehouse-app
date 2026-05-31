import { TaskRecord, TaskItem } from '../../types/task';

export interface TaskRunnerProps {
  task: TaskRecord;
  items: TaskItem[];
  initialProgress?: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>;
  onSaveProgress: (updatedItems: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>) => Promise<void>;
  onFinishTask: (updatedItems: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>) => Promise<void>;
  onCancel: () => void;
  onChat: () => void;
}
