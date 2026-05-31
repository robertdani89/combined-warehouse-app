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
import { useAppTheme } from '../../theme/theme';

export default function ReceivingTask({
  task,
  items,
  initialProgress,
  onSaveProgress,
  onFinishTask,
  onCancel,
  onChat,
}: TaskRunnerProps) {
  const { colors } = useAppTheme();
  const [quickFinish, setQuickFinish] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TaskItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [issueState, setIssueState] = useState<number | null>(null);

  const [sortOption, setSortOption] = useState<number>(0);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const SORT_OPTIONS = [
    "Raktár / Cikk szerint",
    "Cikk szerint"
  ];

  // Overridden items state (id -> override info)
  const [progress, setProgress] = useState<
    Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
  >(initialProgress ?? {});

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    headerBar: {
      backgroundColor: colors.cardBackground,
      borderBottomColor: colors.border,
    },
    taskTitle: {
      color: colors.textMain,
    },
    commentTxt: {
      color: colors.textSecondary,
    },
    quickLabel: {
      color: colors.textMain,
    },
    sortBar: {
      backgroundColor: colors.cardBackground,
      borderBottomColor: colors.border,
    },
    sortLabel: {
      color: colors.textSecondary,
    },
    sortBtn: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundAlt,
    },
    sortBtnTxt: {
      color: colors.primary,
    },
    groupHeader: {
      backgroundColor: colors.backgroundAlt,
    },
    groupHeaderTxt: {
      color: colors.textSecondary,
    },
    itemCard: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    cikknev: {
      color: colors.textMain,
    },
    footerButtons: {
      backgroundColor: colors.cardBackground,
      borderTopColor: colors.border,
    },
    cancelBtn: {
      backgroundColor: colors.secondary,
    },
    chatBtn: {
      backgroundColor: colors.primary,
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
    dialogMenuBtn: {
      backgroundColor: colors.backgroundAlt,
    },
    dialogMenuBtnTxt: {
      color: colors.textMain,
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
    modalSaveBtn: {
      backgroundColor: colors.success,
    },
    modalAddTxt: {
      color: colors.textOnPrimary,
    },
  });

  // Group and sort items by selected sorting strategy
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const rA = a.Att2 || '';
      const rB = b.Att2 || '';

      const cA = a.Cikknev || '';
      const cB = b.Cikknev || '';

      const tA = a.Tarolo || '';
      const tB = b.Tarolo || '';

      if (sortOption === 0) {
        // Raktár / Cikk szerint
        if (rA !== rB) { return rA.localeCompare(rB); }
        return cA.localeCompare(cB);
      } else {
        // Cikk szerint
        if (cA !== cB) { return cA.localeCompare(cB); }
        if (rA !== rB) { return rA.localeCompare(rB); }
        return tA.localeCompare(tB);
      }
    });
  }, [items, sortOption]);

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
      onSaveProgress(updated).catch(() => { });
      return;
    }

    let nextAllapot = 0;
    if (quickFinish) {
      nextAllapot = 1; // Green
    } else {
      if (currentAll === -1) {
        nextAllapot = 1; // Green
      } else {
        nextAllapot = -1; // Yellow (Részben bevételezve)
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
    onSaveProgress(updated).catch(() => { });
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
    onSaveProgress(updated).catch(() => { });
  };

  const handleOpenIssueDialog = (item: TaskItem) => {
    setSelectedItem(item);
    setIssueState(null);
    setInputValue('');
    setModalVisible(true);
  };

  const handleSaveIssue = (allapot: number, defaultMegj?: string) => {
    if (!selectedItem) { return; }

    const updated = {
      ...progress,
      [selectedItem._id]: {
        allapot,
        mennyiseg: selectedItem.Mennyiseg,
        megjegyzes: defaultMegj || inputValue,
      },
    };
    setProgress(updated);
    onSaveProgress(updated).catch(() => { });

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
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header with Quick Finish */}
      <View style={[styles.headerBar, dynamicStyles.headerBar]}>
        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, dynamicStyles.taskTitle]}>
            {task.megnevezes || `Bevételezés #${task._id}`}
          </Text>
          <Text style={[styles.commentTxt, dynamicStyles.commentTxt]}>{task.comment || 'Nincs külön megjegyzés'}</Text>
        </View>

        <View style={styles.quickSetContainer}>
          <Text style={[styles.quickLabel, dynamicStyles.quickLabel]}>Gyors lejelentés</Text>
          <Switch
            value={quickFinish}
            onValueChange={setQuickFinish}
            trackColor={{ false: '#767577', true: colors.success }}
            thumbColor={Platform.OS === 'android' ? (quickFinish ? colors.success : '#F4F3F4') : undefined}
          />
        </View>
      </View>

      {/* Sorting bar */}
      <View style={[styles.sortBar, dynamicStyles.sortBar]}>
        <Text style={[styles.sortLabel, dynamicStyles.sortLabel]}>Rendezés:</Text>
        <TouchableOpacity
          style={[styles.sortBtn, dynamicStyles.sortBtn]}
          onPress={() => setSortModalVisible(true)}
        >
          <Text style={[styles.sortBtnTxt, dynamicStyles.sortBtnTxt]}>
            {SORT_OPTIONS[sortOption]} ▾
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item._id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const override = progress[item._id];
          const allapot = override ? override.allapot : (item.allapot ?? 0);
          const megj = override ? override.megjegyzes : item.megj;

          let bg = colors.cardBackground;
          let textC = colors.textMain;
          let borderC = colors.border;
          let statusLabelText = '';

          if (allapot === -1) {
            bg = colors.warningBg; // Yellow style
            borderC = colors.warning;
            textC = colors.warning;
            statusLabelText = 'Részben';
          } else if (allapot === 1) {
            bg = colors.successBg; // Green style
            borderC = colors.success;
            textC = colors.success;
            statusLabelText = 'Kész';
          } else if (allapot > 1) {
            bg = colors.dangerBg; // Red style
            borderC = colors.danger;
            textC = colors.danger;

            const errLabels: Record<number, string> = {
              2: 'Nem találom',
              3: 'Már elvitte',
              4: 'Nem érkezett meg',
              5: 'Sérült áru',
              6: 'Hiányos',
              7: 'Egyéb',
            };
            statusLabelText = errLabels[allapot] || 'Eltérés';
          }

          // Group Header if warehouse (Att2) changed
          const prevItem = index > 0 ? sortedItems[index - 1] : null;
          const showHeader = sortOption === 0 && (!prevItem || prevItem.Att2 !== item.Att2);

          return (
            <View>
              {showHeader && (
                <View style={[styles.groupHeader, dynamicStyles.groupHeader]}>
                  <Text style={[styles.groupHeaderTxt, dynamicStyles.groupHeaderTxt]}>Raktár: {item.Att2 || '-'}</Text>
                </View>
              )}

              <View style={[styles.itemCard, dynamicStyles.itemCard, { backgroundColor: bg, borderColor: borderC }]}>
                <TouchableOpacity
                  style={styles.clickableArea}
                  onPress={() => handleSingleClick(item)}
                  delayLongPress={500}
                  onLongPress={() => handleOpenIssueDialog(item)}
                >
                  <View style={styles.infoWrapper}>
                    <Text style={[styles.cikknev, dynamicStyles.cikknev, { color: textC }]}>{item.Cikknev}</Text>
                    <Text style={[styles.detailsText, { color: textC }]}>{item.Etk}</Text>
                    <View style={styles.detailsRow}>
                      <Text style={[styles.detailsText, { color: textC }]}>
                        Tároló: <Text style={styles.boldText}>{item.Tarolo || '-'}</Text>
                      </Text>
                      <Text style={[styles.detailsText, { color: textC }]}>
                        Mennyiség: <Text style={styles.boldText}>{item.Mennyiseg} {item.Mero || 'db'}</Text>
                      </Text>
                    </View>
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

      <View style={[styles.footerButtons, dynamicStyles.footerButtons]}>
        <TouchableOpacity style={[styles.btn, styles.cancelBtn, dynamicStyles.cancelBtn]} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Vissza</Text>
        </TouchableOpacity>

        {onChat ? (
          <TouchableOpacity style={[styles.btn, styles.chatBtn, dynamicStyles.chatBtn]} onPress={onChat}>
            <Text style={styles.chatBtnText}>Csevegés 💬</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Baj Van bejelentés popup modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Hiba bejelentése</Text>
            <Text style={[styles.modalSub, dynamicStyles.modalSub]}>{selectedItem?.Cikknev}</Text>

            {issueState === null ? (
              <View style={styles.btnGrid}>
                <TouchableOpacity
                  style={[styles.dialogMenuBtn, dynamicStyles.dialogMenuBtn]}
                  onPress={() => handleSaveIssue(2, 'Nem találom')}
                >
                  <Text style={[styles.dialogMenuBtnTxt, dynamicStyles.dialogMenuBtnTxt]}>Nem találom</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogMenuBtn, dynamicStyles.dialogMenuBtn]}
                  onPress={() => setIssueState(3)}
                >
                  <Text style={[styles.dialogMenuBtnTxt, dynamicStyles.dialogMenuBtnTxt]}>Már elvitte...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogMenuBtn, dynamicStyles.dialogMenuBtn]}
                  onPress={() => handleSaveIssue(4, 'Nem érkezett meg')}
                >
                  <Text style={[styles.dialogMenuBtnTxt, dynamicStyles.dialogMenuBtnTxt]}>Nem érkezett meg</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogMenuBtn, dynamicStyles.dialogMenuBtn]}
                  onPress={() => setIssueState(5)}
                >
                  <Text style={[styles.dialogMenuBtnTxt, dynamicStyles.dialogMenuBtnTxt]}>Sérült áru...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogMenuBtn, dynamicStyles.dialogMenuBtn]}
                  onPress={() => setIssueState(6)}
                >
                  <Text style={[styles.dialogMenuBtnTxt, dynamicStyles.dialogMenuBtnTxt]}>Hiányos...</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dialogMenuBtn, dynamicStyles.dialogMenuBtn]}
                  onPress={() => setIssueState(7)}
                >
                  <Text style={[styles.dialogMenuBtnTxt, dynamicStyles.dialogMenuBtnTxt]}>Egyéb...</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>
                  {issueState === 3
                    ? 'Ki vitte el?'
                    : issueState === 5
                      ? 'Mennyi sérült?'
                      : issueState === 6
                        ? 'Mennyi hiányzik?'
                        : 'Megjegyzés az egyéb eltéréshez:'}
                </Text>
                <TextInput
                  style={[styles.textInput, dynamicStyles.textInput]}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder="Kérjük adja meg a részleteket..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={issueState === 5 || issueState === 6 ? 'numeric' : 'default'}
                  autoFocus
                />

                <View style={styles.inputActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCloseBtn, dynamicStyles.modalCloseBtn]}
                    onPress={() => setIssueState(null)}
                  >
                    <Text style={[styles.modalCancelTxt, dynamicStyles.modalCancelTxt]}>Vissza</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalSaveBtn, dynamicStyles.modalSaveBtn]}
                    onPress={() => handleSaveIssue(issueState)}
                  >
                    <Text style={[styles.modalAddTxt, dynamicStyles.modalAddTxt]}>Mentés</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {issueState === null && (
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn, dynamicStyles.modalCloseBtn, { marginTop: 12, minHeight: 40 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelTxt, dynamicStyles.modalCancelTxt]}>Mégse</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Sort options dialog */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Rendezési opciók</Text>
            <Text style={[styles.modalSub, dynamicStyles.modalSub]}>Válassz egy rendezési szempontot:</Text>

            <View style={styles.btnGrid}>
              {SORT_OPTIONS.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dialogMenuBtn,
                    dynamicStyles.dialogMenuBtn,
                    sortOption === idx && { borderColor: colors.primary, borderWidth: 1.5 }
                  ]}
                  onPress={() => {
                    setSortOption(idx);
                    setSortModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.dialogMenuBtnTxt,
                    dynamicStyles.dialogMenuBtnTxt,
                    sortOption === idx && { color: colors.primary, fontWeight: 'bold' }
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCloseBtn, dynamicStyles.modalCloseBtn, { marginTop: 12, minHeight: 40 }]}
              onPress={() => setSortModalVisible(false)}
            >
              <Text style={[styles.modalCancelTxt, dynamicStyles.modalCancelTxt]}>Mégse</Text>
            </TouchableOpacity>
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
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  sortBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortBtnTxt: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  quickSetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
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
  chatBtn: {
    backgroundColor: '#0284C7',
  },
  chatBtnText: {
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