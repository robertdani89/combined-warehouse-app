export type TaskRecord = {
  _id: number;
  allapot?: number;
  felado?: string;
  fel_tipus?: string;
  megnevezes?: string;
  surgosseg?: number;
  befejezte?: string;
  elkezdte?: string;
  datum?: string;
  kelt?: string;
  hivatkozas?: string;
  comment?: string;
  hiv?: string;
  items?: TaskItem[];
  messages?: unknown[];
};

export type TaskItem = {
  _id: number;
  tetelHiv?: string;
  FeladatId?: number;
  Etk?: string;
  Cikknev?: string;
  Mennyiseg?: number;
  Raktar?: string;
  Tarolo?: string;
  Raktar1?: number;
  Tarolo1?: string;
  Att1?: string;
  Att2?: string;
  Att3?: string;
  Att4?: string;
  Att5?: string;
  vevo?: string;
  varos?: string;
  Mero?: string;
  allapot?: number;
  megj?: string;
  tkeszlet?: number;
  Ido?: string;
};

export interface ReportLogEntry {
  naplo_allapot?: number;
  naplo_mennyiseg?: number;
  naplo_megjegyzes?: string;
  naplo_ido?: string;
}

export interface ReportItem {
  tetel_id?: number;
  _id?: number;
  tetel_etk?: string;
  tetel_tarolohely?: string;
  naplo: ReportLogEntry[];
}

export interface ReportTask {
  id: number;
  allapot?: number;
  befejezte?: string;
  elkezdte?: string;
  items?: ReportItem[];
}

