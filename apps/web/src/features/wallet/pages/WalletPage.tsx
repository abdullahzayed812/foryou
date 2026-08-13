import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useMyWallet,
  useWalletTransactions,
  useMyWithdrawals,
  useRequestWithdrawal,
} from "@/features/wallet/hooks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ErrorAlert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const WITHDRAWAL_STATUS_TONE = {
  pending: "warning",
  processed: "success",
  rejected: "danger",
} as const;

export function WalletPage() {
  const { t } = useTranslation();
  const { data: wallet, isLoading } = useMyWallet();
  const { data: transactions } = useWalletTransactions();
  const { data: withdrawals } = useMyWithdrawals();
  const requestWithdrawal = useRequestWithdrawal();
  const [amount, setAmount] = useState("");

  if (isLoading || !wallet) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t("wallet.title")}</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-neutral-500">{t("wallet.available")}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {Number(wallet.availableBalance).toFixed(2)} {t("common.egp")}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">{t("wallet.pending")}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {Number(wallet.pendingBalance).toFixed(2)} {t("common.egp")}
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">{t("wallet.requestWithdrawal")}</h2>
        <ErrorAlert error={requestWithdrawal.error} />
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextField
              label={t("wallet.amount")}
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            fullWidth={false}
            loading={requestWithdrawal.isPending}
            disabled={!amount}
            onClick={() =>
              requestWithdrawal.mutate(Number(amount), { onSuccess: () => setAmount("") })
            }
          >
            {t("wallet.withdraw")}
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">
          {t("wallet.withdrawalHistory")}
        </h2>
        {withdrawals && withdrawals.length === 0 && (
          <EmptyState title={t("wallet.noWithdrawals")} />
        )}
        <div className="flex flex-col gap-2">
          {withdrawals?.map((w) => (
            <Card key={w.id} className="flex items-center justify-between p-3">
              <span className="text-sm font-medium text-neutral-900">
                {Number(w.amount).toFixed(2)} {t("common.egp")}
              </span>
              <span className="text-xs text-neutral-400">
                {new Date(w.createdAt).toLocaleDateString()}
              </span>
              <Badge tone={WITHDRAWAL_STATUS_TONE[w.status]}>
                {t(`withdrawalStatus.${w.status}`)}
              </Badge>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">
          {t("wallet.transactionHistory")}
        </h2>
        {transactions && transactions.length === 0 && (
          <EmptyState title={t("wallet.noTransactions")} />
        )}
        <div className="flex flex-col gap-2">
          {transactions?.map((tx) => (
            <Card key={tx.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {t(`walletTransactionType.${tx.type}`)}
                </p>
                <p className="text-xs text-neutral-500">{tx.description}</p>
              </div>
              <div className="text-end">
                <p
                  className={`text-sm font-semibold ${Number(tx.amount) < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {Number(tx.amount) > 0 ? "+" : ""}
                  {Number(tx.amount).toFixed(2)} {t("common.egp")}
                </p>
                <p className="text-xs text-neutral-400">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
