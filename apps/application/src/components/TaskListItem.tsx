import { StyleSheet, Text, View } from 'react-native';
import { TaskRecord } from '../types/task';

type TaskListItemProps = {
  task: TaskRecord;
};

const TASK_TYPES = [
  'Leltár',
  'Mozgás',
  'Összesített nézet',
  'Egyéb feladat',
  'Egyéb feladat',
  'Bevételezés',
  'Komissió',
  'Szállítás',
  'Átvétel',
  'Egyedi feladat',
] as const;

const URGENCY_LABELS: Record<number, string> = {
  0: 'Azonnali',
  1: 'Normál',
  2: 'Fontos',
  3: 'Kiemelt',
};

const STATUS_LABELS: Record<number, string> = {
  0: '',
  1: '',
  2: '',
  3: 'Folyamatban',
  4: 'Lejelentendő',
  5: 'Lejelentve',
  6: 'Felfüggesztve',
  7: 'Lejelentendő',
};

const getTaskTypeLabel = (felTipus: TaskRecord['fel_tipus']): string => {
  const index = Number(felTipus);
  if (!Number.isNaN(index) && index >= 0 && index < TASK_TYPES.length) {
    return TASK_TYPES[index];
  }

  return felTipus ? String(felTipus) : 'Ismeretlen típus';
};

const getUrgencyLabel = (surgosseg: TaskRecord['surgosseg']): string | null => {
  if (typeof surgosseg !== 'number' || surgosseg === 1) {
    return null;
  }

  return URGENCY_LABELS[surgosseg] ?? `Sürgősség: ${surgosseg}`;
};

const getStatusLabel = (allapot: TaskRecord['allapot']): string | null => {
  if (typeof allapot !== 'number') {
    return null;
  }

  const label = STATUS_LABELS[allapot];
  return label ? label : null;
};

export default function TaskListItem({ task }: TaskListItemProps) {
  const urgency = getUrgencyLabel(task.surgosseg);
  const statusLabel = getStatusLabel(task.allapot);
  const hasMessages = Array.isArray(task.messages) && task.messages.length > 0;
  const showDone = typeof task.allapot === 'number' && task.allapot >= 4;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{task.megnevezes ?? `Feladat #${task._id}`}</Text>

        <View style={styles.iconRow}>
          {showDone ? <Text style={styles.doneMark}>☑</Text> : null}
          {hasMessages ? <Text style={styles.chatMark}>💬</Text> : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        {urgency ? <Text style={styles.urgency}>{urgency}</Text> : null}
        <Text style={styles.subtitle}>{getTaskTypeLabel(task.fel_tipus)}</Text>
      </View>

      {statusLabel ? <Text style={styles.status}>{statusLabel}</Text> : null}

      <Text style={styles.secondary}>#{task._id}</Text>
      {task.felado ? <Text style={styles.secondary}>Feladó: {task.felado}</Text> : null}
      {task.kelt ? <Text style={styles.secondary}>Kelt: {task.kelt}</Text> : null}
      {task.befejezte ? <Text style={styles.secondary}>Befejeztem: {task.befejezte}</Text> : null}
      {task.comment ? <Text style={styles.comment}>{task.comment}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  doneMark: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 24,
  },
  chatMark: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 24,
  },
  subtitle: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  urgency: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  status: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  secondary: {
    color: '#4B5563',
    fontSize: 12,
  },
  comment: {
    color: '#1F2937',
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 4,
  },
});