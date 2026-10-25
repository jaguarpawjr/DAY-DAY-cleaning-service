/**
 * Paystack API Client for Ghana Cedis (GHS)
 * Supporting:
 * - Settlements & Reconciliation Synchronization
 * - Automated Staff Transfers & Recipient Creation
 * - Automated Refunds & Dispute Handling
 */

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackTransferRecipientInput {
  name: string;
  account_number: string;
  bank_code: string; // e.g. 'MTN', 'VOD', 'ATL' for Ghana Mobile Money, or bank code for NUBAN
  type?: 'mobile_money' | 'nuban';
  currency?: string;
  description?: string;
}

export interface PaystackTransferInput {
  amount: number; // in minor units (pesewas: 1 GHS = 100 pesewas)
  recipient: string; // recipient code from Paystack
  reason: string;
  reference?: string;
  source?: string; // default: 'balance'
}

export interface PaystackRefundInput {
  transaction: string; // transaction reference or ID
  amount?: number; // optional partial refund in pesewas
  merchant_note?: string;
  customer_note?: string;
}

export class PaystackClient {
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.PAYSTACK_SECRET_KEY || '';
  }

  private isConfigured(): boolean {
    return Boolean(this.secretKey && this.secretKey.startsWith('sk_'));
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured or invalid.');
    }

    const url = `${PAYSTACK_BASE_URL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok || data.status === false) {
      const errMessage = data.message || `Paystack request failed with status ${res.status}`;
      const error: any = new Error(errMessage);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // ==========================================
  // 1. Staff Transfers & Recipients
  // ==========================================

  /**
   * Create a transfer recipient (Mobile Money or Bank Account in Ghana)
   */
  async createTransferRecipient(input: PaystackTransferRecipientInput) {
    if (!this.isConfigured()) {
      // Offline / Test mock fallback
      return {
        status: true,
        message: 'Mock recipient created',
        data: {
          recipient_code: `RCP_MOCK_${crypto.randomUUID().slice(0, 10).toUpperCase()}`,
          name: input.name,
          details: { account_number: input.account_number, bank_code: input.bank_code },
        },
      };
    }

    return this.request('/transferrecipient', {
      method: 'POST',
      body: JSON.stringify({
        type: input.type || 'mobile_money',
        name: input.name,
        account_number: input.account_number,
        bank_code: input.bank_code,
        currency: input.currency || 'GHS',
        description: input.description || 'Staff Payroll Recipient',
      }),
    });
  }

  /**
   * Initiate a staff payout transfer
   */
  async initiateTransfer(input: PaystackTransferInput) {
    if (!this.isConfigured()) {
      // Offline / Test mock fallback
      return {
        status: true,
        message: 'Mock transfer initiated',
        data: {
          transfer_code: `TRF_MOCK_${crypto.randomUUID().slice(0, 10).toUpperCase()}`,
          reference: input.reference || `REF_MOCK_${Date.now()}`,
          status: 'success',
          amount: input.amount,
        },
      };
    }

    return this.request('/transfer', {
      method: 'POST',
      body: JSON.stringify({
        source: input.source || 'balance',
        amount: Math.round(input.amount),
        recipient: input.recipient,
        reason: input.reason,
        reference: input.reference,
        currency: 'GHS',
      }),
    });
  }

  /**
   * Verify status of a transfer
   */
  async verifyTransfer(reference: string) {
    if (!this.isConfigured()) {
      return {
        status: true,
        data: { reference, status: 'success' },
      };
    }

    return this.request(`/transfer/verify/${encodeURIComponent(reference)}`);
  }

  // ==========================================
  // 2. Refunds & Chargeback Dispute Handling
  // ==========================================

  /**
   * Issue a refund for a customer payment
   */
  async createRefund(input: PaystackRefundInput) {
    if (!this.isConfigured()) {
      return {
        status: true,
        message: 'Mock refund processed',
        data: {
          id: Date.now(),
          transaction: input.transaction,
          amount: input.amount || 0,
          status: 'processed',
        },
      };
    }

    return this.request('/refund', {
      method: 'POST',
      body: JSON.stringify({
        transaction: input.transaction,
        amount: input.amount ? Math.round(input.amount) : undefined,
        merchant_note: input.merchant_note || 'Customer refund requested by Admin',
        customer_note: input.customer_note || 'Refund for cleaning service',
        currency: 'GHS',
      }),
    });
  }

  // ==========================================
  // 3. Settlements & Reconciliation
  // ==========================================

  /**
   * Fetch settlements from Paystack
   */
  async fetchSettlements(params: { from?: string; to?: string; perPage?: number; page?: number } = {}) {
    if (!this.isConfigured()) {
      return {
        status: true,
        message: 'Mock settlements list',
        data: [
          {
            id: 1001,
            settlement_date: new Date().toISOString().split('T')[0],
            total_amount: 150000, // 1,500.00 GHS in pesewas
            net_amount: 147150, // 1,471.50 GHS after fees
            status: 'success',
          },
        ],
      };
    }

    const q = new URLSearchParams();
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    if (params.perPage) q.append('perPage', String(params.perPage));
    if (params.page) q.append('page', String(params.page));

    return this.request(`/settlement?${q.toString()}`);
  }

  /**
   * Fetch individual transactions within a settlement
   */
  async fetchSettlementTransactions(settlementId: string | number) {
    if (!this.isConfigured()) {
      return { status: true, data: [] };
    }
    return this.request(`/settlement/${settlementId}/transactions`);
  }
}

export const paystack = new PaystackClient();
