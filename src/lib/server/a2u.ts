import { Account, Asset, Keypair, Memo, Operation, TransactionBuilder } from "@stellar/stellar-base";
import { PiApiError, PiConfigError } from "./pi";

/**
 * A2U 블록체인 전송. 공식 pi-apps/pi-nodejs(pi-backend)의 submitPayment와 같은 트랜잭션을 만든다:
 * 앱 지갑 → payment.to_address, 금액 = payment.amount, memo = payment.identifier, 180초 timebounds.
 * (pi-backend는 취약한 axios 0.x가 딸린 stellar-sdk 10을 써서, 서명만 @stellar/stellar-base로 하고 Horizon은 fetch로 호출)
 */
const HORIZON: Record<string, string> = {
  "Pi Network": "https://api.mainnet.minepi.com",
  "Pi Testnet": "https://api.testnet.minepi.com",
};
export const TX_TIMEOUT_S = 180;

export function appWallet() {
  const seed = process.env.PI_WALLET_PRIVATE_SEED;
  if (!seed) throw new PiConfigError("정산용 앱 지갑(PI_WALLET_PRIVATE_SEED)이 아직 설정되지 않았어요.");
  if (!seed.startsWith("S") || seed.length !== 56) throw new PiConfigError("PI_WALLET_PRIVATE_SEED 형식이 올바르지 않아요(S로 시작하는 56자).");
  return Keypair.fromSecret(seed);
}

function horizonOf(payment: PiPaymentDTO) {
  const url = HORIZON[payment.network];
  if (!url) throw new PiApiError(400, `알 수 없는 네트워크: ${payment.network}`);
  return url;
}

async function horizon<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new PiApiError(res.status, (body as { extras?: { result_codes?: unknown } })?.extras?.result_codes ?? body);
  return body as T;
}

export async function submitA2UTransaction(payment: PiPaymentDTO): Promise<string> {
  const kp = appWallet();
  if (payment.from_address !== kp.publicKey()) throw new PiConfigError("PI_WALLET_PRIVATE_SEED가 Pi 앱 지갑 주소와 달라요.");
  const base = horizonOf(payment);
  const [account, fees] = await Promise.all([
    horizon<{ sequence: string }>(`${base}/accounts/${kp.publicKey()}`),
    horizon<{ last_ledger_base_fee: string }>(`${base}/fee_stats`),
  ]);
  const tx = new TransactionBuilder(new Account(kp.publicKey(), account.sequence), {
    fee: fees.last_ledger_base_fee,
    networkPassphrase: payment.network,
  })
    .addOperation(Operation.payment({ destination: payment.to_address, asset: Asset.native(), amount: payment.amount.toFixed(7) }))
    .addMemo(Memo.text(payment.identifier))
    .setTimeout(TX_TIMEOUT_S)
    .build();
  tx.sign(kp);
  const res = await horizon<{ hash: string }>(`${base}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: tx.toXDR() }),
  });
  return res.hash;
}

/** 전송 직후 서버가 죽은 경우를 대비해, 앱 지갑의 최근 거래에서 memo = paymentId인 거래를 찾는다(이중 송금 방지). */
export async function findA2UTransaction(payment: PiPaymentDTO): Promise<string | undefined> {
  const base = horizonOf(payment);
  const r = await horizon<{ _embedded: { records: { hash: string; memo?: string; successful: boolean }[] } }>(
    `${base}/accounts/${payment.from_address}/transactions?order=desc&limit=100`,
  );
  return r._embedded.records.find((t) => t.successful && t.memo === payment.identifier)?.hash;
}
