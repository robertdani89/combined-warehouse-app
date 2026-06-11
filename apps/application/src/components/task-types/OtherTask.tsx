import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { TaskRunnerProps } from './TaskRunnerProps';
import { TaskItem } from '../../types/task';
import { useAppTheme } from '../../theme/theme';

export default function OtherTask({
  task,
  items,
  initialProgress,
  onSaveProgress,
}: TaskRunnerProps) {
  const { colors } = useAppTheme();
  const [selectedItem, setSelectedItem] = useState<TaskItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [commentValue, setCommentValue] = useState('');

  // Overridden items state (id -> override info)
  const [progress, setProgress] = useState<
    Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
  >(initialProgress ?? {});

  const dynamicStyles = StyleSheet.create({
    taskInfoContainer: {
      backgroundColor: colors.cardBackground,
      borderBottomColor: colors.border,
    },
    taskTitle: {
      color: colors.textMain,
    },
    taskComment: {
      color: colors.textMuted,
    },
    itemCard: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    footerButtons: {
      backgroundColor: colors.cardBackground,
      borderTopColor: colors.border,
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
    },
    modalTitle: {
      color: colors.textMain,
    },
    modalSub: {
      color: colors.textMuted,
    },
    inputLabel: {
      color: colors.textMain,
    },
    textInput: {
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.textMain,
    },
    modalCloseBtn: {
      backgroundColor: colors.backgroundAlt,
    },
    modalCancelTxt: {
      color: colors.textSecondary,
    },
    modalAlertBtn: {
      backgroundColor: colors.danger,
    },
    modalAlertTxt: {
      color: colors.textOnPrimary,
    },
    modalSaveBtn: {
      backgroundColor: colors.success,
    },
    modalAddTxt: {
      color: colors.textOnPrimary,
    },
  });

  const handleOpenItem = (item: TaskItem) => {
    setSelectedItem(item);
    const existing = progress[item._id] || {
      allapot: item.allapot ?? 0,
      megjegyzes: item.megj || '',
    };
    setCommentValue(existing.megjegyzes || '');
    setModalVisible(true);
  };

  const handleSaveResult = (allapot: number) => {
    if (!selectedItem) { return; }

    if (allapot === 2 && !commentValue.trim()) {
      Alert.alert('Hiba', 'A hiba bejelentéséhez a megjegyzés mező kitöltése kötelező!');
      return;
    }

    const updated = {
      ...progress,
      [selectedItem._id]: {
        allapot,
        mennyiseg: selectedItem.Mennyiseg,
        megjegyzes: commentValue,
      },
    };
    setProgress(updated);
    onSaveProgress(updated).catch(() => { });

    setModalVisible(false);
    setSelectedItem(null);
  };

  const renderItem = ({ item }: { item: TaskItem }) => {
    const override = progress[item._id];
    const allapot = override ? override.allapot : (item.allapot ?? 0);
    const megj = override ? override.megjegyzes : item.megj;

    let bg = colors.cardBackground;
    let textC = colors.textMain;
    let borderC = colors.border;
    let statusText = 'Nincs elkezdve';

    if (allapot === 1) {
      bg = colors.successBg; // Green
      borderC = colors.success;
      textC = colors.success;
      statusText = 'Kész';
    } else if (allapot === 2) {
      bg = colors.dangerBg; // Red
      borderC = colors.danger;
      textC = colors.danger;
      statusText = 'Probléma bejelentve';
    }

    return (
      <TouchableOpacity
        style={[styles.itemCard, dynamicStyles.itemCard, { backgroundColor: bg, borderColor: borderC }]}
        onPress={() => handleOpenItem(item)}
      >
        <Text style={[styles.itemLeiras, { color: textC }]}>
          {item.Att1 || 'Nincs részletes leírás megadva'}
        </Text>

        {megj ? (
          <Text style={[styles.megjegyText, { color: textC }]}>Megjegyzés: {megj}</Text>
        ) : null}

        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: textC }]}>Állapot: {statusText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.taskInfoContainer, dynamicStyles.taskInfoContainer]}>
        <Text style={[styles.taskTitle, dynamicStyles.taskTitle]}>
          {task.megnevezes || `Egyéb feladat #${task._id}`}
        </Text>
        {task.comment ? <Text style={[styles.taskComment, dynamicStyles.taskComment]}>Megjegyzés: {task.comment}</Text> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      {/* Egyéb feladat modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Feladat elvégzése</Text>
            <Text style={[styles.modalSub, dynamicStyles.modalSub]}>{selectedItem?.Att1}</Text>

            <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Megjegyzés:</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, dynamicStyles.textInput]}
              value={commentValue}
              onChangeText={setCommentValue}
              placeholder="Ide írhatja a megjegyzéseket..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn, dynamicStyles.modalCloseBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelTxt, dynamicStyles.modalCancelTxt]}>Mégse</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalAlertBtn, dynamicStyles.modalAlertBtn]}
                onPress={() => handleSaveResult(2)}
              >
                <Text style={[styles.modalAlertTxt, dynamicStyles.modalAlertTxt]}>Baj van</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, dynamicStyles.modalSaveBtn]}
                onPress={() => handleSaveResult(1)}
              >
                <Text style={[styles.modalAddTxt, dynamicStyles.modalAddTxt]}>Igen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  taskInfoContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  taskComment: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    fontStyle: 'italic',
  },
  listContent: {
    padding: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  itemLeiras: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  megjegyText: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusBadge: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
    marginTop: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: '#F59E0B',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  finishBtn: {
    backgroundColor: '#10B981',
  },
  finishBtnDisabled: {
    backgroundColor: '#A1A1AA',
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#E2E8F0',
  },
  modalCancelTxt: {
    color: '#475569',
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    backgroundColor: '#10B981',
  },
  modalAlertBtn: {
    backgroundColor: '#EF4444',
  },
  modalAlertTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalAddTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});