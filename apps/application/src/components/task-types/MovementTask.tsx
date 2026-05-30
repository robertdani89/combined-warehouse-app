import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { TaskRunnerProps } from './TaskRunnerProps';
import { TaskItem } from '../../types/task';

export default function MovementTask({
  task,
  items,
  initialProgress,
  onSaveProgress,
  onFinishTask,
  onCancel,
}: TaskRunnerProps) {
  const [selectedItem, setSelectedItem] = useState<TaskItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [issueState, setIssueState] = useState<number | null>(null);

  // Overridden items state (id -> override info)
  const [progress, setProgress] = useState<
    Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
  >(initialProgress ?? {});

  const handleToggleDone = (item: TaskItem) => {
    const currentInfo = progress[item._id] || { allapot: item.allapot ?? 0 };
    const nextAllapot = currentInfo.allapot === 1 ? 0 : 1;

    const updated = {
      ...progress,
      [item._id]: {
        allapot: nextAllapot,
        mennyiseg: item.Mennyiseg,
        megjegyzes: '',
      },
    };
    setProgress(updated);
    onSaveProgress(updated).catch(() => {});
  };

  const handleOpenIssueDialog = (item: TaskItem) => {
    setSelectedItem(item);
    setIssueState(null);
    setInputValue('');
    setModalVisible(true);
  };

  const handleSaveIssue = (allapot: number, defaultMegj?: string) => {
    if (!selectedItem) {return;}

    const updated = {
      ...progress,
      [selectedItem._id]: {
        allapot,
        mennyiseg: selectedItem.Mennyiseg,
        megjegyzes: defaultMegj || inputValue,
      },
    };
    setProgress(updated);
    onSaveProgress(updated).catch(() => {});

    setModalVisible(false);
    setSelectedItem(null);
  };

  const allDone = items.every((item) => {
    const allapot = progress[item._id] ? progress[item._id].allapot : (item.allapot ?? 0);
    return allapot !== 0;
  });

  const submitFinish = () => {
    onFinishTask(progress);
  };

  const renderItem = ({ item }: { item: TaskItem }) => {
    const override = progress[item._id];
    const allapot = override ? override.allapot : (item.allapot ?? 0);
    const megj = override ? override.megjegyzes : item.megj;

    let bg = '#FFFFFF';
    let textC = '#0F172A';
    let borderC = '#E2E8F0';
    let statusText = 'Kiadva';

    if (allapot === 1) {
      bg = '#DCFCE7'; // Green
      borderC = '#22C55E';
      textC = '#166534';
      statusText = 'Kikészítve';
    } else if (allapot > 1) {
      bg = '#FEE2E2'; // Red
      borderC = '#EF4444';
      textC = '#991B1B';

      const stateLabels: Record<number, string> = {
        3: 'Nem találom',
        4: 'Nincs kész',
        5: 'Nem érkezett meg',
        6: 'Sérült áru',
        7: 'Hiányos',
        8: 'Egyéb',
      };
      statusText = stateLabels[allapot] || 'Eltérés';
    }

    return (
      <View style={[styles.itemCard, { backgroundColor: bg, borderColor: borderC }]}>
        <View style={styles.cardMain}>
          <View style={styles.itemInfo}>
            <Text style={[styles.cikknev, { color: textC }]}>{item.Cikknev}</Text>
            <View style={styles.detailsRow}>
              <Text style={[styles.detailsText, { color: textC }]}>
                Tárolóhely: <Text style={styles.boldText}>{item.Tarolo || '-'}</Text>
              </Text>
              <Text style={[styles.detailsText, { color: textC }]}>
                Mennyiség: <Text style={styles.boldText}>{item.Mennyiseg} {item.Mero || 'db'}</Text>
              </Text>
            </View>
            {megj ? (
              <Text style={[styles.commentText, { color: textC }]}>Megjegyzés: {megj}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            {/* Quick Toggle Done */}
            <TouchableOpacity
              style={[styles.btnCircle, allapot === 1 && styles.btnCircleDone]}
              onPress={() => handleToggleDone(item)}
            >
              <Text style={[styles.btnCircleTxt, { color: allapot === 1 ? '#FFFFFF' : '#475569' }]}>
                ✓
              </Text>
            </TouchableOpacity>

            {/* Baj Van button */}
            <TouchableOpacity
              style={[styles.btnCircle, allapot > 1 && styles.btnCircleError]}
              onPress={() => handleOpenIssueDialog(item)}
            >
              <Text style={[styles.btnCircleTxt, { color: allapot > 1 ? '#FFFFFF' : '#EF4444' }]}>
                ⚠
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: textC }]}>Állapot: {statusText}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.taskInfoContainer}>
        <Text style={styles.taskTitle}>Mozgás Feladat #{task._id}</Text>
        {task.comment ? <Text style={styles.taskComment}>Megjegyzés: {task.comment}</Text> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footerButtons}>
        <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Vissza</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.finishBtn, !allDone && styles.finishBtnDisabled]}
          onPress={submitFinish}
          disabled={!allDone}
        >
          <Text style={styles.finishBtnText}>Lejelentés</Text>
        </TouchableOpacity>
      </View>

      {/* Baj Van / Eltérés modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hiba bejelentése</Text>
            <Text style={styles.modalSub}>{selectedItem?.Cikknev}</Text>

            {issueState === null ? (
              <View style={styles.btnGrid}>
                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => handleSaveIssue(3, 'Nem találom')}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Nem találom</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => handleSaveIssue(4, 'Nincs kész')}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Nincs kész</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => handleSaveIssue(5, 'Nem érkezett meg')}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Nem érkezett meg</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => {
                    setIssueState(6); // Sérült áru
                  }}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Sérült áru...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => {
                    setIssueState(7); // Hiányos
                  }}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Hiányos...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => {
                    setIssueState(8); // Egyéb
                  }}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Egyéb...</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {issueState === 6
                    ? 'Mennyi sérült?'
                    : issueState === 7
                    ? 'Mennyi hiányzik?'
                    : 'Egyéb megjegyzés:'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="Kérjük adja meg az értéket/leírást..."
                  keyboardType={issueState === 6 || issueState === 7 ? 'numeric' : 'default'}
                  autoFocus
                />

                <View style={styles.inputActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCloseBtn]}
                    onPress={() => setIssueState(null)}
                  >
                    <Text style={styles.modalCancelTxt}>Vissza</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalSaveBtn]}
                    onPress={() => handleSaveIssue(issueState)}
                  >
                    <Text style={styles.modalAddTxt}>Mentés</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {issueState === null && (
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn, { marginTop: 12 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelTxt}>Mégse</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    padding: 12,
    marginBottom: 10,
    elevation: 1,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  cikknev: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailsText: {
    fontSize: 13,
  },
  boldText: {
    fontWeight: 'bold',
  },
  commentText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCircleDone: {
    backgroundColor: '#10B981',
  },
  btnCircleError: {
    backgroundColor: '#EF4444',
  },
  btnCircleTxt: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 10,
    paddingTop: 8,
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
  cancelBtn: {
    backgroundColor: '#64748B',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
  btnGrid: {
    gap: 10,
    marginBottom: 8,
  },
  dialogMenuBtn: {
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dialogMenuBtnTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputContainer: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  inputActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
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
    backgroundColor: '#0F172A',
  },
  modalAddTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});