import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { TaskRunnerProps } from './TaskRunnerProps';
import { TaskItem } from '../../types/task';
import { useAppTheme } from '../../theme/theme';
import InventorySearch from '../InventorySearch';

type CalculationMode = 'calc' | 'weight';

export default function InventoryTask({
  task,
  items,
  initialProgress,
  onSaveProgress,
  registerExtraButtons,
}: TaskRunnerProps) {
  const { colors } = useAppTheme();
  const [selectedItem, setSelectedItem] = useState<TaskItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [calcMode, setCalculationMode] = useState<CalculationMode>('calc');

  const [sortOption, setSortOption] = useState<number>(0);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [addedItems, setAddedItems] = useState<TaskItem[]>([]);

  const SORT_OPTIONS = [
    "Polc sorrend",
    "Cikknév sorrend",
  ];

  // Overridden items state (id -> override info)
  const [progress, setProgress] = useState<
    Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
  >(initialProgress ?? {});

  // Calculator State
  const [formula, setFormula] = useState('');
  const [calculatedRes, setCalculatedRes] = useState('0');

  // Weight State
  const [sampleQuantity, setSampleQuantity] = useState('1');
  const [sampleWeight, setSampleWeight] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [additionalQuantity, setAdditionalQuantity] = useState('');

  const dynamicStyles = StyleSheet.create({
    taskInfoContainer: {
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
    cikknev: {
      color: colors.textMain,
    },
    etkCode: {
      color: colors.textSecondary,
      backgroundColor: colors.backgroundAlt,
    },
    infoText: {
      color: colors.textSecondary,
    },
    boldText: {
      color: colors.textMain,
    },
    commentLabel: {
      color: colors.textMuted,
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
    tabHeader: {
      borderColor: colors.border,
    },
    tabButton: {
      backgroundColor: colors.backgroundAlt,
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
    },
    tabButtonText: {
      color: colors.textSecondary,
    },
    tabActiveText: {
      color: colors.textOnPrimary,
    },
    calcDisplay: {
      backgroundColor: colors.background,
    },
    formulaText: {
      color: colors.textSecondary,
    },
    resultText: {
      color: colors.success,
    },
    calcBtn: {
      backgroundColor: colors.backgroundAlt,
    },
    calcBtnOp: {
      backgroundColor: colors.border,
    },
    calcBtnEqual: {
      backgroundColor: colors.success,
    },
    calcBtnTxt: {
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
    weightResultBox: {
      backgroundColor: colors.successBg,
      borderColor: colors.success,
    },
    weightResultTitle: {
      color: colors.success,
    },
    weightResultVal: {
      color: colors.success,
    },
    modalActions: {
      borderTopColor: colors.border,
    },
    modalCloseBtn: {
      backgroundColor: colors.backgroundAlt,
    },
    modalCancelTxt: {
      color: colors.textSecondary,
    },
    modalSaveBtn: {
      backgroundColor: colors.primary,
    },
    modalAddTxt: {
      color: colors.textOnPrimary,
    },
    cancelBtn: {
      backgroundColor: colors.secondary,
    },
    chatBtn: {
      backgroundColor: colors.primary,
    },
    finishBtn: {
      backgroundColor: colors.success,
    },
    finishBtnDisabled: {
      backgroundColor: colors.buttonDisabled,
    },
    modalSub: {
      color: colors.textSecondary,
    },
    dialogMenuBtn: {
      backgroundColor: colors.backgroundAlt,
      borderColor: colors.border,
    },
    dialogMenuBtnTxt: {
      color: colors.textMain,
    },
  });

  useEffect(() => {
    registerExtraButtons?.([
      {
        text: 'Talált',
        handler: () => setSearchModalVisible(true),
      },
    ]);

    return () => {
      registerExtraButtons?.([]);
    };
  }, [registerExtraButtons, setSearchModalVisible]);

  // Sort items based on active sorting choice
  const sortedItems = useMemo(() => {
    const all = [...items, ...addedItems];
    return all.sort((a, b) => {
      const tA = a.Tarolo || '';
      const tB = b.Tarolo || '';

      const cA = a.Cikknev || '';
      const cB = b.Cikknev || '';

      if (sortOption === 0) {
        // Polc sorrend
        if (tA !== tB) { return tA.localeCompare(tB); }
        return cA.localeCompare(cB);
      } else {
        // Cikknév sorrend
        return cA.localeCompare(cB);
      }
    });
  }, [items, sortOption, addedItems]);

  const triggerOpenItem = (item: TaskItem) => {
    setSelectedItem(item);
    const existing = progress[item._id] || {
      allapot: item.allapot ?? 0,
      mennyiseg: item.tkeszlet ?? item.Mennyiseg,
      megjegyzes: item.megj || '',
    };

    setFormula('');
    setCalculatedRes('0');

    // Reset weights
    setSampleQuantity('1');
    setSampleWeight('');
    setTotalWeight('');
    setAdditionalQuantity('');

    setCalculationMode('calc');
    setModalVisible(true);
  };

  const handleKeyPress = (char: string) => {
    if (char === 'CE') {
      setFormula('');
      setCalculatedRes('0');
    } else if (char === '⌫') {
      const next = formula.slice(0, -1);
      setFormula(next);
      updateCalcResult(next);
    } else if (char === '=') {
      updateCalcResult(formula);
    } else {
      const next = formula + char;
      setFormula(next);
      updateCalcResult(next);
    }
  };

  const updateCalcResult = (expr: string) => {
    if (!expr) {
      setCalculatedRes('0');
      return;
    }
    try {
      // Safe evaluation of simple math expressions only
      const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
      // eslint-disable-next-line no-eval
      const res = eval(sanitized);
      if (res !== undefined && !isNaN(res)) {
        setCalculatedRes(Number(res).toFixed(2).replace(/\.00$/, ''));
      }
    } catch {
      // Ignore evaluation errors while typing
    }
  };

  const getWeightCalculatedQty = (): number => {
    const sampleQty = parseFloat(sampleQuantity) || 0;
    const sampleWgt = parseFloat(sampleWeight) || 0;
    const totalWgt = parseFloat(totalWeight) || 0;
    const additionalQty = parseFloat(additionalQuantity) || 0;

    if (sampleQty <= 0 || sampleWgt <= 0 || totalWgt <= 0) {
      return 0;
    }

    const unit = selectedItem?.Mero || 'db';
    if (unit === 'db') {
      return additionalQty + Math.round(totalWgt / (sampleWgt / sampleQty));
    } else {
      return additionalQty + Math.round((totalWgt / (sampleWgt / sampleQty)) * 100) / 100.0;
    }
  };

  const handleSaveItem = () => {
    if (!selectedItem) { return; }

    let finalQty = 0;
    let finalAllapot = 1;

    const systemStock = selectedItem.Mennyiseg ?? 0;

    if (calcMode === 'calc') {
      finalQty = parseFloat(calculatedRes) || 0;

      if (finalQty === systemStock) {
        finalAllapot = systemStock === 0 ? 4 : 1;
      } else if (finalQty < systemStock) {
        finalAllapot = 2; // Hiány
      } else {
        finalAllapot = 3; // Többlet
      }
    } else {
      finalQty = getWeightCalculatedQty();
      if (finalQty === systemStock) {
        finalAllapot = 1;
      } else if (Math.abs(1.0 - finalQty / (systemStock || 1)) <= 0.05) {
        finalAllapot = 5; // Hibahatáron belüli eltérés
      } else if (finalQty < systemStock) {
        finalAllapot = 2;
      } else {
        finalAllapot = 3;
      }
    }

    const updated = {
      ...progress,
      [selectedItem._id]: {
        allapot: finalAllapot,
        mennyiseg: finalQty,
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
    const counted = override ? override.mennyiseg : item.tkeszlet;
    const hasBeenCounted = counted !== undefined && counted !== null;

    let bg = colors.cardBackground;
    let borderC = colors.border;
    let statusText = 'Nincs leltározva';

    if (hasBeenCounted) {
      if (allapot === 1 || allapot === 4 || allapot === 5) {
        bg = colors.successBg; // Green
        borderC = colors.success;
        statusText = 'Rendben';
      } else if (allapot === 2) {
        bg = colors.dangerBg; // Red
        borderC = colors.danger;
        statusText = 'Hiány';
      } else if (allapot === 3) {
        bg = colors.dangerBg; // Red
        borderC = colors.danger;
        statusText = 'Többlet';
      }
    }

    return (
      <TouchableOpacity
        style={[styles.itemCard, dynamicStyles.itemCard, { backgroundColor: bg, borderColor: borderC }]}
        onPress={() => triggerOpenItem(item)}
      >
        <View style={styles.itemHeader}>
          <Text style={[styles.cikknev, dynamicStyles.cikknev]}>{item.Cikknev}</Text>
          <Text style={[styles.etkCode, dynamicStyles.etkCode]}>{item.Etk || 'Nincs kód'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoText, dynamicStyles.infoText]}>
            Tárolóhely: <Text style={[styles.boldText, dynamicStyles.boldText]}>{item.Tarolo || 'Nincs megadva'}</Text>
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={[styles.statusLabel, { color: borderC === colors.border ? colors.textSecondary : borderC }]}>
            {statusText}
          </Text>
          {override?.megjegyzes ? (
            <Text style={[styles.commentLabel, dynamicStyles.commentLabel]}>Megj: {override.megjegyzes}</Text>
          ) : item.megj ? (
            <Text style={[styles.commentLabel, dynamicStyles.commentLabel]}>Megj: {item.megj}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.taskInfoContainer, dynamicStyles.taskInfoContainer]}>
        <View>
          <Text style={[styles.taskTitle, dynamicStyles.taskTitle]}>
            {task.megnevezes || `Leltár Feladat #${task._id}`}
          </Text>
          {task.comment ? <Text style={[styles.taskComment, dynamicStyles.taskComment]}>Megjegyzés: {task.comment}</Text> : null}
        </View>

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
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={searchModalVisible} transparent animationType="slide" onRequestClose={() => setSearchModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>            <InventorySearch
            feladatID={task._id}
            onSelect={(sel) => {
              const tmpId = -Date.now();
              const newItem: TaskItem = {
                _id: tmpId as any,
                Cikknev: sel.nev,
                Etk: sel.etk,
                Mero: sel.mero,
                Tarolo: sel.tarolo,
                Mennyiseg: 0,
                tkeszlet: 0,
                allapot: 0,
              } as unknown as TaskItem;

              setAddedItems((s) => [newItem, ...s]);
              setSearchModalVisible(false);
              setTimeout(() => triggerOpenItem(newItem), 200);
            }}
          />

            <TouchableOpacity style={[styles.modalColumBtn, styles.modalCloseBtn, { marginTop: 12, height: 48 }]} onPress={() => setSearchModalVisible(false)}>
              <Text style={[styles.modalCancelTxt, dynamicStyles.modalCancelTxt]}>Bezár</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Leltár Counting Dialog */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>{selectedItem?.Cikknev}</Text>

            {/* Tabs */}
            <View style={[styles.tabHeader, dynamicStyles.tabHeader]}>
              <TouchableOpacity
                style={[styles.tabButton, dynamicStyles.tabButton, calcMode === 'calc' && styles.tabButtonActive, calcMode === 'calc' && dynamicStyles.tabButtonActive]}
                onPress={() => setCalculationMode('calc')}
              >
                <Text style={[styles.tabButtonText, dynamicStyles.tabButtonText, calcMode === 'calc' && styles.tabActiveText, calcMode === 'calc' && dynamicStyles.tabActiveText]}>
                  Számológép
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, dynamicStyles.tabButton, calcMode === 'weight' && styles.tabButtonActive, calcMode === 'weight' && dynamicStyles.tabButtonActive]}
                onPress={() => setCalculationMode('weight')}
              >
                <Text style={[styles.tabButtonText, dynamicStyles.tabButtonText, calcMode === 'weight' && styles.tabActiveText, calcMode === 'weight' && dynamicStyles.tabActiveText]}>
                  Súly mérése
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {calcMode === 'calc' ? (
                <View>
                  <View style={[styles.calcDisplay, dynamicStyles.calcDisplay]}>
                    <Text style={[styles.formulaText, dynamicStyles.formulaText]}>{formula || '0'}</Text>
                    <Text style={[styles.resultText, dynamicStyles.resultText]}>Eredmény: {calculatedRes} {selectedItem?.Mero || 'db'}</Text>
                  </View>

                  <View style={styles.calculatorGrid}>
                    {[
                      ['7', '8', '9', '÷'],
                      ['4', '5', '6', '×'],
                      ['1', '2', '3', '-'],
                      ['0', '.', '', '+'],
                      ['(', ')', '⌫', 'CE'],
                    ].map((row, rIdx) => (
                      <View key={rIdx} style={styles.calcRow}>
                        {row.map((btn) => (
                          <TouchableOpacity
                            key={btn}
                            style={[
                              styles.calcBtn,
                              dynamicStyles.calcBtn,
                              btn === '=' && styles.calcBtnEqual,
                              btn === '=' && dynamicStyles.calcBtnEqual,
                              ['+', '-', '×', '÷'].includes(btn) && styles.calcBtnOp,
                              ['+', '-', '×', '÷'].includes(btn) && dynamicStyles.calcBtnOp,
                            ]}
                            onPress={() => {
                              let mappedVal = btn;
                              if (btn === '×') { mappedVal = '*'; }
                              if (btn === '÷') { mappedVal = '/'; }
                              handleKeyPress(mappedVal);
                            }}
                          >
                            <Text style={[styles.calcBtnTxt, dynamicStyles.calcBtnTxt]}>{btn}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.weightContainer}>
                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Minta darabszám:</Text>
                  <TextInput
                    style={[styles.textInput, dynamicStyles.textInput]}
                    value={sampleQuantity}
                    onChangeText={setSampleQuantity}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Minta súlya (g):</Text>
                  <TextInput
                    style={[styles.textInput, dynamicStyles.textInput]}
                    value={sampleWeight}
                    onChangeText={setSampleWeight}
                    keyboardType="numeric"
                    placeholder="pl. 12.5"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Összes mérlegelt súly (g):</Text>
                  <TextInput
                    style={[styles.textInput, dynamicStyles.textInput]}
                    value={totalWeight}
                    onChangeText={setTotalWeight}
                    keyboardType="numeric"
                    placeholder="pl. 1250"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Plusz darabok (pl. teli dobozok):</Text>
                  <TextInput
                    style={[styles.textInput, dynamicStyles.textInput]}
                    value={additionalQuantity}
                    onChangeText={setAdditionalQuantity}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <View style={[styles.weightResultBox, dynamicStyles.weightResultBox]}>
                    <Text style={[styles.weightResultTitle, dynamicStyles.weightResultTitle]}>Számított leltári mennyiség:</Text>
                    <Text style={[styles.weightResultVal, dynamicStyles.weightResultVal]}>
                      {getWeightCalculatedQty()} {selectedItem?.Mero || 'db'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalActions, dynamicStyles.modalActions]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn, dynamicStyles.modalCloseBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelTxt, dynamicStyles.modalCancelTxt]}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, dynamicStyles.modalSaveBtn]}
                onPress={handleSaveItem}
              >
                <Text style={[styles.modalAddTxt, dynamicStyles.modalAddTxt]}>Hozzáadás</Text>
              </TouchableOpacity>
            </View>
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
              style={[styles.modalBtn, styles.modalCloseBtn, dynamicStyles.modalCloseBtn, { marginTop: 12, flex: 0, height: 44 }]}
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
    flex: 1
  },
  taskInfoContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cikknev: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  etkCode: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statusBadge: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontStyle: 'italic',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
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
    marginBottom: 16,
  },
  tabHeader: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  tabActiveText: {
    color: '#FFFFFF',
  },
  modalScroll: {
    maxHeight: 380,
  },
  calcDisplay: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  formulaText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'right',
  },
  resultText: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 4,
  },
  calculatorGrid: {
    gap: 6,
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 6,
  },
  calcBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcBtnOp: {
    backgroundColor: '#CBD5E1',
  },
  calcBtnEqual: {
    backgroundColor: '#10B981',
  },
  calcBtnTxt: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
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
  weightContainer: {
    gap: 2,
  },
  weightResultBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  weightResultTitle: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
  },
  weightResultVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#047857',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalColumBtn: {
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
  sortLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sortBtnTxt: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  btnGrid: {
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  dialogMenuBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  dialogMenuBtnTxt: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
});