import { StyleSheet, Text, View } from 'react-native';
import { TaskRecord } from '../types/task';
import { useAppTheme } from '../theme/theme';

type TaskListItemProps = {
  task: TaskRecord;
};

const TASK_TYPES = [
  'Leltár',
  'NapiLeltár',
  'Árumozgatás',
  'Egyéb',
  'Tranzit leltár',
  'Készlet mozgás',
  'Összeszedés',
  'Bepakolás',
  '',
  'Bevételezés',
] as const;

const URGENCY_LABELS: Record<number, string> = {
  0: 'Azonnali',
  1: 'Normál',
  2: 'Ráér',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Rögzítve',
  1: 'Kiosztva',
  2: 'Megkapta',
  3: 'Elkezdve',
  4: 'Befejezve',
  5: 'Lejelentve',
  6: 'Ellenőrizve',
  7: 'Felfüggesztve',
  8: 'Meghiúsult',
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

export default function TaskListItem({ task }: TaskListItemProps) {
  const { colors } = useAppTheme();
  const urgency = getUrgencyLabel(task.surgosseg);
  const hasMessages = Array.isArray(task.messages) && task.messages.length > 0;
  const showDone = typeof task.allapot === 'number' && task.allapot >= 4;

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    title: {
      color: colors.textMain,
    },
    doneMark: {
      color: colors.textMain,
    },
    chatMark: {
      color: colors.textMain,
    },
    unreadBadge: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.danger,
    },
    unreadText: {
      color: colors.danger,
    },
    subtitle: {
      color: colors.textMuted,
    },
    urgency: {
      color: colors.textMuted,
    },
    secondary: {
      color: colors.textSecondary,
    },
    comment: {
      color: colors.textMain,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, dynamicStyles.title]}>{task.megnevezes ?? `${getTaskTypeLabel(task.fel_tipus)} #${task._id}`}</Text>

        <View style={styles.iconRow}>
          {showDone ? <Text style={[styles.doneMark, dynamicStyles.doneMark]}>☑</Text> : null}
          {task.hasUnread ? (
            <View style={[styles.unreadBadge, dynamicStyles.unreadBadge]}>
              <Text style={[styles.unreadText, dynamicStyles.unreadText]}>Új 🔴</Text>
            </View>
          ) : hasMessages ? (
            <Text style={[styles.chatMark, dynamicStyles.chatMark]}>💬</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        {urgency && <Text style={[styles.urgency, dynamicStyles.urgency]}>{urgency}</Text>}
        {task.megnevezes && <Text style={[styles.subtitle, dynamicStyles.subtitle]}>{getTaskTypeLabel(task.fel_tipus)} #{task._id}</Text>}
      </View>

      {task.felado && <Text style={[styles.secondary, dynamicStyles.secondary]}>Feladó: {task.felado}</Text>}
      {task.kelt && <Text style={[styles.secondary, dynamicStyles.secondary]}>Kelt: {task.kelt}</Text>}
      {task.befejezte && <Text style={[styles.secondary, dynamicStyles.secondary]}>Befejeztem: {task.befejezte}</Text>}
      {task.comment && <Text style={[styles.comment, dynamicStyles.comment]}>{task.comment}</Text>}
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
  unreadBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: 'bold',
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