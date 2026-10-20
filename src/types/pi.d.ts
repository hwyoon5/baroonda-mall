type PiScope = "username" | "payments" | "roles" | "in_app_notifications" | "wallet_address";

type PiPaymentDTO = {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  from_address: string;
  to_address: string;
  direction: "user_to_app" | "app_to_user";
  created_at: string;
  network: "Pi Network" | "Pi Testnet";
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | { txid: string; verified: boolean; _link: string };
};

type PiAuthResult = { accessToken: string; user: { uid: string; username: string; roles?: string[] } };

type PiPaymentData = { amount: number; memo: string; metadata: Record<string, unknown> };

type PiPaymentCallbacks = {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PiPaymentDTO) => void;
};

interface PiSDK {
  init(config: { version: string; sandbox?: boolean }): void;
  authenticate(scopes: PiScope[], onIncompletePaymentFound: (payment: PiPaymentDTO) => void): Promise<PiAuthResult>;
  createPayment(data: PiPaymentData, callbacks: PiPaymentCallbacks): void;
}

interface Window {
  Pi?: PiSDK;
}
