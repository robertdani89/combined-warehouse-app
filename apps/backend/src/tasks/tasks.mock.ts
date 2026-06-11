import { TaskRecord } from "./tasks.type";

function getFormattedDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export const tasksMock: TaskRecord[] = [
    {
        _id: 133922,
        felado: 'danir',
        fel_tipus: '9',
        datum: getFormattedDate(new Date()),
        kelt: '2026-06-11 11:41:03.043',
        megnevezes: 'Ledvance várható',
        allapot: 2,
        surgosseg: 1,
    },
];