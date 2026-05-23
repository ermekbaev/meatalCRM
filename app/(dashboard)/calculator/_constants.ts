/**
 * Справочные константы калькуляторов: материалы, плотности, типы резки.
 * Не зависит от React — обычный модуль.
 */

export const MATERIALS = [
  {
    id: "hot-rolled",
    label: "Сталь горячекатаная",
    shortName: "ГК",
    description: "Расчёт по справочнику (ГОСТ)",
    density: 7850,
  },
  {
    id: "cold-rolled",
    label: "Сталь холоднокатаная",
    shortName: "ХК",
    description: "Плотность 7850 кг/м³",
    density: 7850,
  },
  {
    id: "galvanized",
    label: "Оцинкованный лист",
    shortName: "ОЦИНК",
    description: "Масса покрытия не учтена",
    density: 7850,
  },
  {
    id: "stainless",
    label: "Нержавеющая сталь",
    shortName: "НЕРЖ",
    description: "Выбор марки стали",
    density: 7930,
  },
  {
    id: "aluminum",
    label: "Алюминий",
    shortName: "АЛ",
    description: "Выбор марки сплава",
    density: 2700,
  },
  {
    id: "copper",
    label: "Медь",
    shortName: "Cu",
    description: "Плотность 8960 кг/м³",
    density: 8960,
  },
  {
    id: "brass",
    label: "Латунь",
    shortName: "ЛС",
    description: "Плотность 8500 кг/м³",
    density: 8500,
  },
  {
    id: "titanium",
    label: "Титан",
    shortName: "Ti",
    description: "Плотность 4510 кг/м³",
    density: 4510,
  },
  {
    id: "zinc",
    label: "Цинк",
    shortName: "Zn",
    description: "Плотность 7140 кг/м³",
    density: 7140,
  },
];

export const DENSITY_OPTIONS: Record<string, { label: string; value: number }[]> = {
  stainless: [
    { label: "По умолчанию (7930 кг/м³)", value: 7930 },
    { label: "AISI 304 (7930 кг/м³)", value: 7930 },
    { label: "AISI 316 (8000 кг/м³)", value: 8000 },
    { label: "AISI 430 (7700 кг/м³)", value: 7700 },
  ],
  aluminum: [
    { label: "По умолчанию (2700 кг/м³)", value: 2700 },
    { label: "1050 / 1060 (2700 кг/м³)", value: 2700 },
    { label: "5083 (2650 кг/м³)", value: 2650 },
    { label: "6061 / 6082 (2700 кг/м³)", value: 2700 },
    { label: "7075 (2810 кг/м³)", value: 2810 },
  ],
};

export const HISTORY_KEY = "metalcrm-calc-history";

export const CUT_TYPES = [
  { id: "laser", label: "Лазерная резка" },
  { id: "plasma", label: "Плазменная резка" },
  { id: "hydro", label: "Гидроабразивная резка" },
  { id: "mech", label: "Механическая резка" },
];

export const BENDING_MATERIAL_OPTIONS = [
  { id: "hot-rolled",  label: "Г/К сталь" },
  { id: "cold-rolled", label: "Х/К сталь" },
  { id: "galvanized",  label: "Оцинковка" },
  { id: "stainless",   label: "Нержавейка" },
  { id: "aluminum",    label: "Алюминий" },
];

export const CUTTING_MATERIAL_OPTIONS = [
  { id: "hot-rolled", label: "Г/К сталь" },
  { id: "cold-rolled", label: "Х/К сталь" },
  { id: "galvanized", label: "Оцинковка" },
  { id: "stainless", label: "Нержавейка" },
  { id: "aluminum", label: "Алюминий" },
];
