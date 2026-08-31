import { TaskMessage } from "src/messages/messages.service";

export interface TaskItem {
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
}

export interface TaskRecord {
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
    messages?: TaskMessage[];
    hasUnread?: boolean;
}

export interface ReportItem {
    tetel_id?: number;
    _id?: number;
    tetel_etk?: string;
    tetel_tarolohely?: string;
    naplo: ReportLogEntry[];
}

export interface ReportLogEntry {
    naplo_allapot?: number;
    naplo_mennyiseg?: number;
    naplo_megjegyzes?: string;
    naplo_ido: string;
}

export interface ReportTask {
    id: number;
    allapot?: number;
    befejezte?: string;
    elkezdte?: string;
    items?: ReportItem[];
}

export interface MarkReceivedRequest {
    taskIds: number[];
}

export interface ReportTasksRequest {
    tasks: ReportTask[];
    phoneTime?: string;
}

export interface ReportTaskItemRequest {
    item: ReportItem;
    phoneTime?: string;
}

export interface RequestTasksRequest {
    userName: string;
    taskIds: number[];
}