import { TaskRecord, TaskItem } from '../../types/task';

export interface ExtraButton {
  text: string;
  handler: () => void;
}

export interface TaskRunnerProps {
  task: TaskRecord;
  items: TaskItem[];
  initialProgress?: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>;
  onSaveProgress: (updatedItems: Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>) => Promise<void>;
  registerExtraButtons?: (buttons: ExtraButton[]) => void;
}
