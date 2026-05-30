import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { TaskRunnerProps } from './TaskRunnerProps';
import { TaskItem } from '../../types/task';

export default function PickingTask({
  task,
  items,
  initialProgress,
  onSaveProgress,
  onFinishTask,
  onCancel,
}: TaskRunnerProps) {
  const [quickFinish, setQuickFinish] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TaskItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [issueState, setIssueState] = useState<number | null>(null);
  const [otherSuccess, setOtherSuccess] = useState(false);

  // Overridden items state (id -> override info)
  const [progress, setProgress] = useState<
    Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
  >(initialProgress ?? {});

  // Group items by headers (if consecutive items have different group values)
  const sortedItems = useMemo(() => {
    // Sort items by Att2 (warehouse group) and Cikknev
    return [...items].sort((a, b) => {
      const gA = a.Att2 || '';
      const gB = b.Att2 || '';
      if (gA !== gB) {return gA.localeCompare(gB);}
      return (a.Cikknev || '').localeCompare(b.Cikknev || '');
    });
  }, [items]);

  const handleSingleClick = (item: TaskItem) => {
    const currentInfo = progress[item._id] || { allapot: item.allapot ?? 0 };
    const currentAll = currentInfo.allapot;

    if (currentAll >= 1) {
      // Toggle back to Kiadva (0) if clicked again while completed
      const updated = {
        ...progress,
        [item._id]: {
          allapot: 0,
          mennyiseg: item.Mennyiseg,
          megjegyzes: '',
        },
      };
      setProgress(updated);
      onSaveProgress(updated).catch(() => {});
      return;
    }

    let nextAllapot = 0;
    if (quickFinish) {
      nextAllapot = 1; // Green
    } else {
      if (currentAll === -1) {
        nextAllapot = 1; // Green
      } else {
        nextAllapot = -1; // Yellow
      }
    }

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

  const handleDoubleClick = (item: TaskItem) => {
    const updated = {
      ...progress,
      [item._id]: {
        allapot: 0,
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
    setOtherSuccess(false);
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

  return (
    <View style={styles.container}>
      {/* Quick Finish switch and header */}
      <View style={styles.headerBar}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>Összeszedés #{task._id}</Text>
          <Text style={styles.commentTxt}>{task.comment || 'Nincs külön megjegyzés'}</Text>
        </View>

        <View style={styles.quickSetContainer}>
          <Text style={styles.quickLabel}>Gyors lejelentés</Text>
          <Switch
            value={quickFinish}
            onValueChange={setQuickFinish}
            trackColor={{ false: '#767577', true: '#10B981' }}
            thumbColor={Platform.OS === 'android' ? (quickFinish ? '#34D399' : '#F4F3F4') : undefined}
          />
        </View>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item._id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const override = progress[item._id];
          const allapot = override ? override.allapot : (item.allapot ?? 0);
          const megj = override ? override.megjegyzes : item.megj;

          let bg = '#FFFFFF';
          let textC = '#0F172A';
          let borderC = '#E2E8F0';
          let statusLabelText = '';

          if (allapot === -1) {
            bg = '#FEF08A'; // Yellow style
            borderC = '#EAB308';
            textC = '#854D0E';
            statusLabelText = 'Részben';
          } else if (allapot === 1) {
            bg = '#DCFCE7'; // Green style
            borderC = '#22C55E';
            textC = '#166534';
            statusLabelText = 'Kész';
          } else if (allapot > 1) {
            bg = '#FEE2E2'; // Red style
            borderC = '#EF4444';
            textC = '#991B1B';

            const errLabels: Record<number, string> = {
              2: 'Nem találom',
              3: 'Nincs kész',
              4: 'Nem érkezett meg',
              5: 'Sérült áru',
              6: 'Hiányos',
              7: 'Egyéb eltérés',
            };
            statusLabelText = errLabels[allapot] || 'Hiba';
          }

          // Show Group Header if first item, or warehouse (Att2) changed
          const prevItem = index > 0 ? sortedItems[index - 1] : null;
          const showHeader = !prevItem || prevItem.Att2 !== item.Att2;

          return (
            <View>
              {showHeader && (
                <View style={styles.groupHeader}>
                  <Text style={styles.groupHeaderTxt}>Raktár: {item.Att2 || 'Fő raktár'}</Text>
                </View>
              )}

              <View style={[styles.itemCard, { backgroundColor: bg, borderColor: borderC }]}>
                <TouchableOpacity
                  style={styles.clickableArea}
                  onPress={() => handleSingleClick(item)}
                  delayLongPress={500}
                  onLongPress={() => handleOpenIssueDialog(item)}
                >
                  <View style={styles.infoWrapper}>
                    <Text style={[styles.cikknev, { color: textC }]}>{item.Cikknev}</Text>
                    <View style={styles.detailsRow}>
                      <Text style={[styles.detailsText, { color: textC }]}>
                        Tároló: <Text style={styles.boldText}>{item.Tarolo || '-'}</Text>
                      </Text>
                      <Text style={[styles.detailsText, { color: textC }]}>
                        Mennyiség: <Text style={styles.boldText}>{item.Mennyiseg} {item.Mero || 'db'}</Text>
                      </Text>
                    </View>
                    {item.Att4 ? (
                      <Text style={[styles.specMegj, { color: textC }]}>Infó: {item.Att4}</Text>
                    ) : null}
                    {megj ? (
                      <Text style={[styles.specMegj, { color: textC, fontWeight: '700' }]}>
                        Megj: {megj}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.rightActions}>
                    <TouchableOpacity
                      style={styles.quickResetBtn}
                      onPress={() => handleDoubleClick(item)}
                    >
                      <Text style={styles.resetBtnTxt}>↺</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.bajBtn}
                      onPress={() => handleOpenIssueDialog(item)}
                    >
                      <Text style={styles.bajBtnTxt}>⚠</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {statusLabelText ? (
                  <View style={styles.cardFooter}>
                    <Text style={[styles.statusBadgeTxt, { color: textC }]}>
                      Állapot: {statusLabelText}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
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

      {/* Baj Van alert popup menu */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hiba bejelentése</Text>
            <Text style={styles.modalSub}>{selectedItem?.Cikknev}</Text>

            {issueState === null ? (
              <View style={styles.btnGrid}>
                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => handleSaveIssue(2, 'Nem találom')}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Nem találom</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => handleSaveIssue(3, 'Nincs kész')}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Nincs kész</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => handleSaveIssue(4, 'Nem érkezett meg')}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Nem érkezett meg</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => setIssueState(5)}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Sérült áru...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => setIssueState(6)}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Hiányos...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogMenuBtn}
                  onPress={() => setIssueState(7)}
                >
                  <Text style={styles.dialogMenuBtnTxt}>Egyéb eltérés...</Text>
                </TouchableOpacity>
              </View>
            ) : issueState === 7 ? (
              // Special prompt for state 7 (Egyéb: comment + Is successful?)
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Megjegyzés az egyéb eltéréshez:</Text>
                <TextInput
                  style={styles.textInput}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="Hiba részletes leírása..."
                  autoFocus
                />

                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, otherSuccess && styles.checkboxChecked]}
                    onPress={() => setOtherSuccess(!otherSuccess)}
                  >
                    {otherSuccess && <Text style={styles.checkedMark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Sikeres feladatvégzés?</Text>
                </View>

                <View style={styles.inputActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCloseBtn]}
                    onPress={() => setIssueState(null)}
                  >
                    <Text style={styles.modalCancelTxt}>Vissza</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalSaveBtn]}
                    onPress={() => handleSaveIssue(otherSuccess ? 1 : 7)}
                  >
                    <Text style={styles.modalAddTxt}>Mentés</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Numeric dynamic values for 5, 6
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {issueState === 5 ? 'Mennyi darab sérült?' : 'Mennyi hiányzik?'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="pl. 5"
                  keyboardType="numeric"
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
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  commentTxt: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  quickSetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  listContent: {
    padding: 12,
  },
  groupHeader: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  groupHeaderTxt: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
  },
  clickableArea: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoWrapper: {
    flex: 1,
    marginRight: 10,
  },
  cikknev: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
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
  specMegj: {
    fontSize: 11,
    marginTop: 4,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickResetBtn: {
    width: 36,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnTxt: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  bajBtn: {
    width: 36,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bajBtnTxt: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  statusBadgeTxt: {
    fontSize: 12,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  checkedMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
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