import type { RoleFeeView } from '@/lib/fee-privacy'

export function FeeCallout({ fees, className }: { fees: RoleFeeView; className?: string }) {
  if (fees.role === 'worker') {
    const suffix =
      fees.expensesTotal > 0
        ? ` ($${fees.laborValue.toFixed(2)} − $${fees.yourFee.toFixed(2)} fee + $${fees.expensesTotal.toFixed(2)} expenses)`
        : ` ($${fees.laborValue.toFixed(2)} − $${fees.yourFee.toFixed(2)} fee)`
    return (
      <p className={className ?? 'text-sm'}>
        <span className="font-bold">You&apos;ll get: ${fees.youGet.toFixed(2)}</span>
        <span className="text-muted-foreground">{suffix}</span>
      </p>
    )
  }

  const suffix =
    fees.expensesTotal > 0
      ? ` ($${fees.laborValue.toFixed(2)} labor + $${fees.yourFee.toFixed(2)} fee + $${fees.expensesTotal.toFixed(2)} expenses)`
      : ` ($${fees.laborValue.toFixed(2)} labor + $${fees.yourFee.toFixed(2)} fee)`
  return (
    <p className={className ?? 'text-sm'}>
      <span className="font-bold">You&apos;ll pay: ${fees.youPay.toFixed(2)}</span>
      <span className="text-muted-foreground">{suffix}</span>
    </p>
  )
}
