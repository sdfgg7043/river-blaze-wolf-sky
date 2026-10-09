export type Line = {
  id: string;
  details: string;
  qty: string;
  price: string;
  amount: string;
  auto: boolean;
};

export type Shop = {
  name: string;
  activity: string;
  address: string;
  phone: string;
  honorific: string;
  legal: string;
  showTafqeet: boolean;
  arabicDigits: boolean;
};

export type Invoice = {
  id: string;
  customer: string;
  dateDay: string;
  dateMonth: string;
  dateYear: string;
  lines: Line[];
  signature: string;
  savedAt: number | null;
};

export type BackupFile = {
  shop: Shop;
  draft: Invoice;
  archive: Invoice[];
};
