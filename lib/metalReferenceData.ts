// Справочник реальных весов листового металла (на основе ГОСТ)
// thickness: мм, width: мм, length: мм, massPerSqM: кг/м², sheetMass: кг

export interface MetalEntry {
  materialId: string;
  thickness: number;
  width: number;
  length: number;
  massPerSqM: number;
  sheetMass: number;
}

// Горячекатаная сталь (Г/К)
export const hotRolledData: MetalEntry[] = [
  { materialId: "hot-rolled", thickness: 1.5,  width: 1250, length: 2500, massPerSqM: 11.78,  sheetMass: 36.8    },
  { materialId: "hot-rolled", thickness: 2.0,  width: 1250, length: 2500, massPerSqM: 15.7,   sheetMass: 49.06   },
  { materialId: "hot-rolled", thickness: 3.0,  width: 1250, length: 2500, massPerSqM: 23.55,  sheetMass: 73.59   },
  { materialId: "hot-rolled", thickness: 4.0,  width: 1500, length: 6000, massPerSqM: 31.4,   sheetMass: 282.6   },
  { materialId: "hot-rolled", thickness: 5.0,  width: 1500, length: 3000, massPerSqM: 39.25,  sheetMass: 176.62  },
  { materialId: "hot-rolled", thickness: 5.0,  width: 1500, length: 6000, massPerSqM: 39.25,  sheetMass: 353.25  },
  { materialId: "hot-rolled", thickness: 6.0,  width: 1500, length: 6000, massPerSqM: 47.1,   sheetMass: 423.9   },
  { materialId: "hot-rolled", thickness: 8.0,  width: 1500, length: 6000, massPerSqM: 62.8,   sheetMass: 565.2   },
  { materialId: "hot-rolled", thickness: 10.0, width: 1500, length: 6000, massPerSqM: 78.5,   sheetMass: 706.5   },
  { materialId: "hot-rolled", thickness: 12.0, width: 1500, length: 6000, massPerSqM: 94.2,   sheetMass: 847.8   },
  { materialId: "hot-rolled", thickness: 14.0, width: 1500, length: 6000, massPerSqM: 109.9,  sheetMass: 989.1   },
  { materialId: "hot-rolled", thickness: 14.0, width: 2000, length: 6000, massPerSqM: 109.9,  sheetMass: 1318.8  },
  { materialId: "hot-rolled", thickness: 16.0, width: 1500, length: 6000, massPerSqM: 125.6,  sheetMass: 1130.4  },
  { materialId: "hot-rolled", thickness: 16.0, width: 2000, length: 6000, massPerSqM: 125.6,  sheetMass: 1507.2  },
  { materialId: "hot-rolled", thickness: 18.0, width: 2000, length: 6000, massPerSqM: 141.3,  sheetMass: 1271.7  },
  { materialId: "hot-rolled", thickness: 20.0, width: 2000, length: 6000, massPerSqM: 157.0,  sheetMass: 1884.0  },
  { materialId: "hot-rolled", thickness: 22.0, width: 2000, length: 6000, massPerSqM: 172.7,  sheetMass: 2072.4  },
  { materialId: "hot-rolled", thickness: 25.0, width: 2000, length: 6000, massPerSqM: 196.25, sheetMass: 2652.0  },
  { materialId: "hot-rolled", thickness: 30.0, width: 2000, length: 6000, massPerSqM: 235.5,  sheetMass: 2826.0  },
  { materialId: "hot-rolled", thickness: 32.0, width: 2000, length: 6000, massPerSqM: 251.2,  sheetMass: 3014.4  },
  { materialId: "hot-rolled", thickness: 36.0, width: 2000, length: 6000, massPerSqM: 282.6,  sheetMass: 3391.2  },
  { materialId: "hot-rolled", thickness: 40.0, width: 2000, length: 6000, massPerSqM: 314.0,  sheetMass: 3768.0  },
  { materialId: "hot-rolled", thickness: 50.0, width: 2000, length: 6000, massPerSqM: 392.5,  sheetMass: 4710.0  },
];

// Холоднокатаная сталь (Х/К)
export const coldRolledData: MetalEntry[] = [
  { materialId: "cold-rolled", thickness: 0.4, width: 1000, length: 2000, massPerSqM: 3.14,   sheetMass: 6.28       },
  { materialId: "cold-rolled", thickness: 0.5, width: 1000, length: 2000, massPerSqM: 3.925,  sheetMass: 7.85       },
  { materialId: "cold-rolled", thickness: 0.7, width: 1250, length: 2500, massPerSqM: 5.495,  sheetMass: 17.171875  },
  { materialId: "cold-rolled", thickness: 0.8, width: 1250, length: 2500, massPerSqM: 6.28,   sheetMass: 19.625     },
  { materialId: "cold-rolled", thickness: 1.0, width: 1250, length: 2500, massPerSqM: 7.85,   sheetMass: 24.53125   },
  { materialId: "cold-rolled", thickness: 1.2, width: 1250, length: 2500, massPerSqM: 9.42,   sheetMass: 29.4375    },
  { materialId: "cold-rolled", thickness: 1.5, width: 1250, length: 2500, massPerSqM: 11.775, sheetMass: 36.796875  },
  { materialId: "cold-rolled", thickness: 2.0, width: 1250, length: 2500, massPerSqM: 15.7,   sheetMass: 49.0625    },
  { materialId: "cold-rolled", thickness: 2.5, width: 1500, length: 3000, massPerSqM: 19.625, sheetMass: 88.3125    },
  { materialId: "cold-rolled", thickness: 3.0, width: 1500, length: 3000, massPerSqM: 23.55,  sheetMass: 105.975    },
  { materialId: "cold-rolled", thickness: 4.0, width: 1500, length: 6000, massPerSqM: 31.4,   sheetMass: 282.6      },
  { materialId: "cold-rolled", thickness: 5.0, width: 1500, length: 6000, massPerSqM: 39.25,  sheetMass: 353.25     },
];

// Оцинкованный лист
export const galvanizedData: MetalEntry[] = [
  { materialId: "galvanized", thickness: 0.4, width: 1000, length: 2000, massPerSqM: 3.34,  sheetMass: 6.68    },
  { materialId: "galvanized", thickness: 0.5, width: 1000, length: 2000, massPerSqM: 4.13,  sheetMass: 8.26    },
  { materialId: "galvanized", thickness: 0.7, width: 1250, length: 2500, massPerSqM: 5.75,  sheetMass: 17.97   },
  { materialId: "galvanized", thickness: 0.8, width: 1250, length: 2500, massPerSqM: 6.53,  sheetMass: 20.41   },
  { materialId: "galvanized", thickness: 1.0, width: 1250, length: 2500, massPerSqM: 8.1,   sheetMass: 25.31   },
  { materialId: "galvanized", thickness: 1.2, width: 1250, length: 2500, massPerSqM: 9.67,  sheetMass: 30.22   },
  { materialId: "galvanized", thickness: 1.5, width: 1250, length: 2500, massPerSqM: 12.03, sheetMass: 37.59   },
  { materialId: "galvanized", thickness: 2.0, width: 1500, length: 6000, massPerSqM: 15.95, sheetMass: 143.55  },
  { materialId: "galvanized", thickness: 2.5, width: 1500, length: 6000, massPerSqM: 19.88, sheetMass: 178.88  },
  { materialId: "galvanized", thickness: 3.0, width: 1500, length: 6000, massPerSqM: 23.8,  sheetMass: 214.2   },
];

// Нержавеющая сталь (AISI 304)
export const stainlessData: MetalEntry[] = [
  { materialId: "stainless", thickness: 0.5,  width: 1000, length: 2000, massPerSqM: 3.97,  sheetMass: 7.93    },
  { materialId: "stainless", thickness: 0.8,  width: 1250, length: 2500, massPerSqM: 6.34,  sheetMass: 19.83   },
  { materialId: "stainless", thickness: 1.0,  width: 1250, length: 2500, massPerSqM: 7.93,  sheetMass: 24.78   },
  { materialId: "stainless", thickness: 1.5,  width: 1500, length: 3000, massPerSqM: 11.9,  sheetMass: 53.53   },
  { materialId: "stainless", thickness: 2.0,  width: 1500, length: 3000, massPerSqM: 15.86, sheetMass: 71.37   },
  { materialId: "stainless", thickness: 2.5,  width: 1500, length: 3000, massPerSqM: 19.83, sheetMass: 89.21   },
  { materialId: "stainless", thickness: 3.0,  width: 1500, length: 6000, massPerSqM: 23.79, sheetMass: 214.11  },
  { materialId: "stainless", thickness: 4.0,  width: 1500, length: 6000, massPerSqM: 31.72, sheetMass: 285.48  },
  { materialId: "stainless", thickness: 5.0,  width: 1500, length: 6000, massPerSqM: 39.65, sheetMass: 356.85  },
  { materialId: "stainless", thickness: 6.0,  width: 1500, length: 6000, massPerSqM: 47.58, sheetMass: 428.22  },
  { materialId: "stainless", thickness: 8.0,  width: 1500, length: 6000, massPerSqM: 63.44, sheetMass: 570.96  },
  { materialId: "stainless", thickness: 10.0, width: 1500, length: 6000, massPerSqM: 79.3,  sheetMass: 713.7   },
];

// Алюминий (6061)
export const aluminumData: MetalEntry[] = [
  { materialId: "aluminum", thickness: 0.5,  width: 1000, length: 2000, massPerSqM: 1.35, sheetMass: 2.7   },
  { materialId: "aluminum", thickness: 0.8,  width: 1250, length: 2500, massPerSqM: 2.16, sheetMass: 6.75  },
  { materialId: "aluminum", thickness: 1.0,  width: 1250, length: 2500, massPerSqM: 2.7,  sheetMass: 8.44  },
  { materialId: "aluminum", thickness: 1.5,  width: 1500, length: 3000, massPerSqM: 4.05, sheetMass: 18.23 },
  { materialId: "aluminum", thickness: 2.0,  width: 1500, length: 3000, massPerSqM: 5.4,  sheetMass: 24.3  },
  { materialId: "aluminum", thickness: 2.5,  width: 1500, length: 3000, massPerSqM: 6.75, sheetMass: 30.38 },
  { materialId: "aluminum", thickness: 3.0,  width: 1500, length: 6000, massPerSqM: 8.1,  sheetMass: 72.9  },
  { materialId: "aluminum", thickness: 4.0,  width: 1500, length: 6000, massPerSqM: 10.8, sheetMass: 97.2  },
  { materialId: "aluminum", thickness: 5.0,  width: 1500, length: 6000, massPerSqM: 13.5, sheetMass: 121.5 },
  { materialId: "aluminum", thickness: 6.0,  width: 1500, length: 6000, massPerSqM: 16.2, sheetMass: 145.8 },
  { materialId: "aluminum", thickness: 8.0,  width: 1500, length: 6000, massPerSqM: 21.6, sheetMass: 194.4 },
  { materialId: "aluminum", thickness: 10.0, width: 1500, length: 6000, massPerSqM: 27.0, sheetMass: 243.0 },
];

export const ALL_METAL_ENTRIES: MetalEntry[] = [
  ...hotRolledData,
  ...coldRolledData,
  ...galvanizedData,
  ...stainlessData,
  ...aluminumData,
];

/** Ищет запись в справочнике по материалу, толщине и размеру */
export function findMetalEntry(
  materialId: string,
  thickness: number,
  width: number,
  length: number,
): MetalEntry | undefined {
  return ALL_METAL_ENTRIES.find(
    (e) =>
      e.materialId === materialId &&
      e.thickness === thickness &&
      e.width === width &&
      e.length === length,
  );
}

/** Возвращает все толщины для данного материала из справочника */
export function getThicknessesForMaterial(materialId: string): number[] {
  return [
    ...new Set(
      ALL_METAL_ENTRIES.filter((e) => e.materialId === materialId).map((e) => e.thickness),
    ),
  ].sort((a, b) => a - b);
}

/** Возвращает доступные размеры для данного материала и толщины */
export function getSizesForMaterial(materialId: string, thickness: number) {
  return ALL_METAL_ENTRIES.filter(
    (e) => e.materialId === materialId && e.thickness === thickness,
  ).map((e) => ({ width: e.width, length: e.length }));
}
