import type { Ingredient } from "../types";

export type ExpiryLevel = "red" | "yellow" | "green";

export type ExpiryStatus = {
  level: ExpiryLevel;
  label: string;
  shortLabel: string;
  className: string;
  sortPriority: number;
  daysLeft: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const LEVEL_TO_DAYS: Record<ExpiryLevel, number> = {
  red: 1,
  yellow: 3,
  green: 7,
};

export const resolveDaysUntilExpiry = (ingredient: Partial<Ingredient>): number | null => {
  if (typeof ingredient.days_until_expiry === "number" && Number.isFinite(ingredient.days_until_expiry)) {
    return ingredient.days_until_expiry;
  }

  if (!ingredient.expiry_date) {
    return null;
  }

  const expiry = new Date(ingredient.expiry_date);
  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / DAY_MS);
};

export const getExpiryStatus = (ingredient: Partial<Ingredient>): ExpiryStatus => {
  const daysLeft = resolveDaysUntilExpiry(ingredient);

  if (daysLeft === null) {
    return {
      level: "green",
      label: "很新鲜",
      shortLabel: "很新鲜",
      className: "bg-green-100 text-green-700 border-green-200",
      sortPriority: 2,
      daysLeft: null,
    };
  }

  if (daysLeft <= 1) {
    return {
      level: "red",
      label: "立即吃",
      shortLabel: "立即吃",
      className: "bg-red-100 text-red-700 border-red-200",
      sortPriority: 0,
      daysLeft,
    };
  }

  if (daysLeft <= 3) {
    return {
      level: "yellow",
      label: "尽快吃",
      shortLabel: "尽快吃",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
      sortPriority: 1,
      daysLeft,
    };
  }

  return {
    level: "green",
    label: "很新鲜",
    shortLabel: "很新鲜",
    className: "bg-green-100 text-green-700 border-green-200",
    sortPriority: 2,
    daysLeft,
  };
};

export const expiryDateFromLevel = (level: ExpiryLevel): string => {
  const date = new Date();
  date.setDate(date.getDate() + LEVEL_TO_DAYS[level]);
  date.setHours(23, 59, 59, 0);
  return date.toISOString();
};
