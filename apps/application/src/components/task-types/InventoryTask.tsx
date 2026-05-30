import React, { useState } from 'react';
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

type CalculationMode = 'calc' | 'weight';

export default function InventoryTask({
  task,
  items,
  initialProgress,
  onSaveProgress,
  onFinishTask,
  onCancel,
}: TaskRunnerProps) {
  const [selectedItem, setSelectedItem] = useState<TaskItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [calcMode, setCalculationMode] = useState<CalculationMode>('calc');

  // Overridden items state (id -> override info)
  const [progress, setProgress] = useState<
    Record<number, { allapot: number; mennyiseg?: number; megjegyzes?: string }>
  >(initialProgress ?? {});

  // Calculator State
  const [formula, setFormula] = useState('');
  const [calculatedRes, setCalculatedRes] = useState('0');
  const [calcBin, setCalcBin] = useState('');
  const [calcComment, setCalcComment] = useState('');

  // Weight State
  const [sampleQuantity, setSampleQuantity] = useState('1');
  const [sampleWeight, setSampleWeight] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [additionalQuantity, setAdditionalQuantity] = useState('');

  const triggerOpenItem = (item: TaskItem) => {
    setSelectedItem(item);
    const existing = progress[item._id] || {
      allapot: item.allapot ?? 0,
      mennyiseg: item.tkeszlet ?? item.Mennyiseg,
      megjegyzes: item.megj || '',
    };

    setCalcBin(item.Tarolo || '');
    setCalcComment(existing.megjegyzes || '');
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
    if (!selectedItem) {return;}

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
        megjegyzes: calcMode === 'calc' ? calcComment : 'Súlyra leltározva',
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
    const counted = override ? override.mennyiseg : item.tkeszlet;
    const hasBeenCounted = counted !== undefined && counted !== null;

    let bg = '#FFFFFF';
    let borderC = '#CBD5E1';
    let statusText = 'Nincs leltározva';

    if (hasBeenCounted) {
      if (allapot === 1 || allapot === 4 || allapot === 5) {
        bg = '#DCFCE7'; // Green
        borderC = '#22C55E';
        statusText = 'Rendben';
      } else if (allapot === 2) {
        bg = '#FEE2E2'; // Red
        borderC = '#EF4444';
        statusText = 'Hiány';
      } else if (allapot === 3) {
        bg = '#FEE2E2'; // Red
        borderC = '#EF4444';
        statusText = 'Többlet';
      }
    }

    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: bg, borderColor: borderC }]}
        onPress={() => triggerOpenItem(item)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.cikknev}>{item.Cikknev}</Text>
          <Text style={styles.etkCode}>{item.Etk || 'Nincs kód'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            Tárolóhely: <Text style={styles.boldText}>{item.Tarolo || 'Nincs megadva'}</Text>
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={[styles.statusLabel, { color: borderC === '#CBD5E1' ? '#475569' : borderC }]}>
            {statusText}
          </Text>
          {override?.megjegyzes ? (
            <Text style={styles.commentLabel}>Megj: {override.megjegyzes}</Text>
          ) : item.megj ? (
            <Text style={styles.commentLabel}>Megj: {item.megj}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.taskInfoContainer}>
        <Text style={styles.taskTitle}>Leltár Feladat #{task._id}</Text>
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

      {/* Leltár Counting Dialog */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedItem?.Cikknev}</Text>

            {/* Tabs */}
            <View style={styles.tabHeader}>
              <TouchableOpacity
                style={[styles.tabButton, calcMode === 'calc' && styles.tabButtonActive]}
                onPress={() => setCalculationMode('calc')}
              >
                <Text style={[styles.tabButtonText, calcMode === 'calc' && styles.tabActiveText]}>
                  Számológép
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, calcMode === 'weight' && styles.tabButtonActive]}
                onPress={() => setCalculationMode('weight')}
              >
                <Text style={[styles.tabButtonText, calcMode === 'weight' && styles.tabActiveText]}>
                  Súly mérése
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {calcMode === 'calc' ? (
                <View>
                  <View style={styles.calcDisplay}>
                    <Text style={styles.formulaText}>{formula || '0'}</Text>
                    <Text style={styles.resultText}>Eredmény: {calculatedRes} {selectedItem?.Mero || 'db'}</Text>
                  </View>

                  <View style={styles.calculatorGrid}>
                    {[
                      ['7', '8', '9', '÷'],
                      ['4', '5', '6', '×'],
                      ['1', '2', '3', '-'],
                      ['0', '.', '=', '+'],
                      ['(', ')', '⌫', 'CE'],
                    ].map((row, rIdx) => (
                      <View key={rIdx} style={styles.calcRow}>
                        {row.map((btn) => (
                          <TouchableOpacity
                            key={btn}
                            style={[
                              styles.calcBtn,
                              btn === '=' && styles.calcBtnEqual,
                              ['+', '-', '×', '÷'].includes(btn) && styles.calcBtnOp,
                            ]}
                            onPress={() => {
                              let mappedVal = btn;
                              if (btn === '×') {mappedVal = '*';}
                              if (btn === '÷') {mappedVal = '/';}
                              handleKeyPress(mappedVal);
                            }}
                          >
                            <Text style={styles.calcBtnTxt}>{btn}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Tárolóhely módosítása:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={calcBin}
                    onChangeText={setCalcBin}
                    placeholder="Tároló"
                  />

                  <Text style={styles.inputLabel}>Megjegyzés:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={calcComment}
                    onChangeText={setCalcComment}
                    placeholder="Megjegyzés az eltéréshez..."
                  />
                </View>
              ) : (
                <View style={styles.weightContainer}>
                  <Text style={styles.inputLabel}>Minta darabszám:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={sampleQuantity}
                    onChangeText={setSampleQuantity}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>Minta súlya (g):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={sampleWeight}
                    onChangeText={setSampleWeight}
                    keyboardType="numeric"
                    placeholder="pl. 12.5"
                  />

                  <Text style={styles.inputLabel}>Összes mérlegelt súly (g):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={totalWeight}
                    onChangeText={setTotalWeight}
                    keyboardType="numeric"
                    placeholder="pl. 1250"
                  />

                  <Text style={styles.inputLabel}>Plusz darabok (pl. teli dobozok):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={additionalQuantity}
                    onChangeText={setAdditionalQuantity}
                    keyboardType="numeric"
                    placeholder="0"
                  />

                  <View style={styles.weightResultBox}>
                    <Text style={styles.weightResultTitle}>Számított leltári mennyiség:</Text>
                    <Text style={styles.weightResultVal}>
                      {getWeightCalculatedQty()} {selectedItem?.Mero || 'db'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelTxt}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleSaveItem}
              >
                <Text style={styles.modalAddTxt}>Hozzáadás</Text>
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