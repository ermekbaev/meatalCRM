import { describe, it, expect } from "vitest";
import {
  getPageParams,
  paginated,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/lib/pagination";

function qs(s: string) {
  return new URLSearchParams(s);
}

describe("getPageParams", () => {
  it("дефолтные значения при пустых параметрах", () => {
    const p = getPageParams(qs(""));
    expect(p).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it("корректные параметры дают ожидаемый skip/take", () => {
    const p = getPageParams(qs("page=3&pageSize=20"));
    expect(p.page).toBe(3);
    expect(p.pageSize).toBe(20);
    expect(p.skip).toBe(40); // (3-1) * 20
    expect(p.take).toBe(20);
  });

  it("отрицательные/нулевые page сводятся к 1", () => {
    expect(getPageParams(qs("page=0")).page).toBe(1);
    expect(getPageParams(qs("page=-5")).page).toBe(1);
  });

  it("мусорный page → 1, мусорный pageSize → дефолт", () => {
    const p = getPageParams(qs("page=abc&pageSize=zzz"));
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("pageSize ограничен потолком MAX_PAGE_SIZE", () => {
    const p = getPageParams(qs(`pageSize=${MAX_PAGE_SIZE * 10}`));
    expect(p.pageSize).toBe(MAX_PAGE_SIZE);
    expect(p.take).toBe(MAX_PAGE_SIZE);
  });

  it("дробные значения округляются вниз", () => {
    const p = getPageParams(qs("page=2.9&pageSize=10.7"));
    expect(p.page).toBe(2);
    expect(p.pageSize).toBe(10);
  });

  it("кастомный defaultPageSize применяется, если pageSize не задан", () => {
    const p = getPageParams(qs(""), 25);
    expect(p.pageSize).toBe(25);
    expect(p.take).toBe(25);
  });
});

describe("paginated", () => {
  it("возвращает канонический формат {items,total,page,pageSize}", () => {
    const params = getPageParams(qs("page=2&pageSize=10"));
    const result = paginated(["a", "b", "c"], 42, params);
    expect(result).toEqual({
      items: ["a", "b", "c"],
      total: 42,
      page: 2,
      pageSize: 10,
    });
  });
});
