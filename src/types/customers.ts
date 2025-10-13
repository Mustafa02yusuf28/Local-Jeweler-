export interface CustomerPurchase {
  invoiceNo?: number;
  dateISO: string;
  totalAmount: number;
  dataParam?: string;
}

export interface CustomerRecord {
  name: string;
  mobile: string;
  address?: string;
  purchases: CustomerPurchase[];
}


