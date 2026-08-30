// A small built-in reference of psychiatric medications, grouped, with the
// tablet / capsule strengths commonly available. It is a convenience picker for
// the prescribe form — NOT a formulary, NOT dosing guidance, and never
// exhaustive. Both the name and the dosage always stay free-text, so anything
// missing here can still be entered by hand.
//
// Pure data — safe for the client bundle and any package.

export interface RefDrug {
  /** INN, Russian. */
  name: string;
  /** Available single-unit strengths, ascending. Free text on purpose. */
  dosages: string[];
}

export interface DrugGroup {
  id: string;
  label: string;
  drugs: RefDrug[];
}

export const DRUG_GROUPS: DrugGroup[] = [
  {
    id: "antidepressants",
    label: "Антидепрессанты",
    drugs: [
      { name: "Сертралин", dosages: ["25 мг", "50 мг", "100 мг"] },
      { name: "Эсциталопрам", dosages: ["5 мг", "10 мг", "15 мг", "20 мг"] },
      { name: "Циталопрам", dosages: ["10 мг", "20 мг", "40 мг"] },
      { name: "Флуоксетин", dosages: ["10 мг", "20 мг"] },
      { name: "Пароксетин", dosages: ["20 мг", "30 мг"] },
      { name: "Флувоксамин", dosages: ["50 мг", "100 мг"] },
      { name: "Венлафаксин", dosages: ["37,5 мг", "75 мг", "150 мг"] },
      { name: "Дулоксетин", dosages: ["30 мг", "60 мг"] },
      { name: "Бупропион", dosages: ["150 мг", "300 мг"] },
      { name: "Миртазапин", dosages: ["15 мг", "30 мг", "45 мг"] },
      { name: "Агомелатин", dosages: ["25 мг"] },
      { name: "Вортиоксетин", dosages: ["5 мг", "10 мг", "20 мг"] },
      { name: "Тразодон", dosages: ["50 мг", "100 мг", "150 мг"] },
    ],
  },
  {
    id: "mood_stabilizers",
    label: "Нормотимики",
    drugs: [
      { name: "Лития карбонат", dosages: ["300 мг"] },
      { name: "Вальпроевая кислота", dosages: ["150 мг", "300 мг", "500 мг"] },
      { name: "Ламотриджин", dosages: ["25 мг", "50 мг", "100 мг"] },
      { name: "Карбамазепин", dosages: ["200 мг", "400 мг"] },
      { name: "Окскарбазепин", dosages: ["150 мг", "300 мг", "600 мг"] },
    ],
  },
  {
    id: "antipsychotics",
    label: "Антипсихотики",
    drugs: [
      { name: "Кветиапин", dosages: ["25 мг", "50 мг", "100 мг", "200 мг", "300 мг"] },
      { name: "Оланзапин", dosages: ["2,5 мг", "5 мг", "10 мг", "15 мг", "20 мг"] },
      { name: "Арипипразол", dosages: ["5 мг", "10 мг", "15 мг", "20 мг", "30 мг"] },
      { name: "Рисперидон", dosages: ["1 мг", "2 мг", "4 мг"] },
      { name: "Палиперидон", dosages: ["3 мг", "6 мг", "9 мг"] },
      { name: "Луразидон", dosages: ["20 мг", "40 мг", "80 мг"] },
      { name: "Зипрасидон", dosages: ["20 мг", "40 мг", "60 мг", "80 мг"] },
      { name: "Клозапин", dosages: ["25 мг", "100 мг"] },
      { name: "Хлорпротиксен", dosages: ["15 мг", "50 мг"] },
      { name: "Сульпирид", dosages: ["50 мг", "200 мг"] },
    ],
  },
  {
    id: "anxiolytics",
    label: "Противотревожные",
    drugs: [
      { name: "Гидроксизин", dosages: ["25 мг"] },
      { name: "Буспирон", dosages: ["5 мг", "10 мг"] },
      { name: "Прегабалин", dosages: ["25 мг", "75 мг", "150 мг", "300 мг"] },
      { name: "Клоназепам", dosages: ["0,5 мг", "1 мг", "2 мг"] },
      { name: "Лоразепам", dosages: ["1 мг", "2,5 мг"] },
      { name: "Диазепам", dosages: ["2 мг", "5 мг", "10 мг"] },
      { name: "Феназепам", dosages: ["0,5 мг", "1 мг", "2,5 мг"] },
    ],
  },
  {
    id: "hypnotics",
    label: "Снотворные",
    drugs: [
      { name: "Зопиклон", dosages: ["7,5 мг"] },
      { name: "Золпидем", dosages: ["5 мг", "10 мг"] },
      { name: "Доксиламин", dosages: ["15 мг"] },
      { name: "Мелатонин", dosages: ["1 мг", "3 мг", "5 мг"] },
    ],
  },
];

const BY_NAME = new Map<string, { group: DrugGroup; drug: RefDrug }>();
for (const group of DRUG_GROUPS) {
  for (const drug of group.drugs) {
    BY_NAME.set(drug.name.toLowerCase(), { group, drug });
  }
}

/** Look a drug up by exact name (case-insensitive). */
export function findRefDrug(name: string): { group: DrugGroup; drug: RefDrug } | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}
