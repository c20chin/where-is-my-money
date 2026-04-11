export type Currency = {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
};

export type SavingType = {
  id: number;
  name: string;
  label: string;
};

export type Account = {
  id: string;
  userId: string;
  accountName: string;
  bankName: string;
  savingTypeId: number;
  currencyCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type BalanceSnapshot = {
  id: string;
  accountId: string;
  year: number;
  month: number;
  amount: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExchangeRate = {
  id: number;
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  date: string;
};

export type UserPreferences = {
  userId: string;
  displayCurrency: string;
};

export type DashboardData = {
  totalsByType: {
    savingType: SavingType;
    total: string;
    currency: string;
  }[];
  totalsByCurrency: {
    currency: string;
    total: string;
    convertedTotal: string;
  }[];
  convertedGrandTotal: string;
  displayCurrency: string;
  monthlyTrends: {
    year: number;
    month: number;
    total: string;
  }[];
};
