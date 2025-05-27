import { DepositRecord } from './DepositRecord';
import { DepositRecords } from './DepositRecords';
import { Bill } from './Bill';
import { Bills } from './Bills';
import { BalanceModification } from './Amortization/BalanceModification';
import { UsageDetail } from './Bill/DepositRecord/UsageDetail';
import dayjs, { Dayjs } from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { LocalDate, ChronoUnit } from '@js-joda/core';

import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

import { PaymentAllocationStrategyName, PaymentComponent, PaymentPriority } from './PaymentApplication/Types';

import { Currency } from '../utils/Currency';
import { DateUtil } from '../utils/DateUtil';
import { PaymentApplicationResult } from './PaymentApplication/PaymentApplicationResult';
import { AllocationStrategy } from './PaymentApplication/AllocationStrategy';
import { FIFOStrategy } from './PaymentApplication/FIFOStrategy';
import { LIFOStrategy } from './PaymentApplication/LIFOStrategy';
import { EqualDistributionStrategy } from './PaymentApplication/EqualDistributionStrategy';
import { CustomOrderStrategy } from './PaymentApplication/CustomOrderStrategy';
import { Amortization } from './Amortization';
import type { BillingModel } from './LendPeak';

// Payment Application Module
export class PaymentApplication {
  bills: Bills;
  deposits: DepositRecords;
  amortization: Amortization;
  currentDate: LocalDate;
  private allocationStrategy: AllocationStrategy;
  private paymentPriority: PaymentPriority;
  private billingModel: BillingModel;

  constructor(params: {
    currentDate: LocalDate;
    amortization: Amortization;
    bills: Bills;
    deposits: DepositRecords;
    billingModel?: BillingModel;
    options?: { allocationStrategy?: AllocationStrategy; paymentPriority?: PaymentPriority };
  }) {
    this.currentDate = params.currentDate;
    this.bills = params.bills;
    this.bills.sortBills();
    this.deposits = params.deposits;
    this.amortization = params.amortization;
    this.deposits.sortByEffectiveDate();
    this.billingModel = params.billingModel || 'amortized';

    // Default to LIFO strategy if not provided
    params.options = params.options || {};
    this.allocationStrategy = params.options.allocationStrategy || new FIFOStrategy();

    if (!params.options.paymentPriority) {
      params.options.paymentPriority = ['interest', 'fees', 'principal'];
    } else {
      params.options.paymentPriority = params.options.paymentPriority;
      // Ensure all components are included
      const components: PaymentPriority = ['interest', 'fees', 'principal'];
      for (const component of components) {
        if (!params.options.paymentPriority.includes(component)) {
          throw new Error(`Missing payment component in priority list: ${component}`);
        }
      }
    }
    this.paymentPriority = params.options.paymentPriority;
  }

  static getAllocationStrategyFromName(strategyName: PaymentAllocationStrategyName): AllocationStrategy {
    let allocationStrategy: AllocationStrategy;
    switch (strategyName) {
      case 'FIFO':
        allocationStrategy = new FIFOStrategy();
        break;
      case 'LIFO':
        allocationStrategy = new LIFOStrategy();
        break;
      case 'EqualDistribution':
        allocationStrategy = new EqualDistributionStrategy();
        break;
      case 'CustomOrder':
        allocationStrategy = new CustomOrderStrategy((a: Bill, b: Bill) =>
          ChronoUnit.DAYS.between(a.dueDate, b.dueDate)
        );
        break;
      default:
        throw new Error(`Unknown allocation strategy: ${strategyName}`);
    }
    return allocationStrategy;
  }

  static getAllocationStrategyFromClass(strategy: AllocationStrategy): PaymentAllocationStrategyName {
    let strategyName: PaymentAllocationStrategyName;
    if (strategy instanceof FIFOStrategy) {
      strategyName = 'FIFO';
    } else if (strategy instanceof LIFOStrategy) {
      strategyName = 'LIFO';
    } else if (strategy instanceof EqualDistributionStrategy) {
      strategyName = 'EqualDistribution';
    } else if (strategy instanceof CustomOrderStrategy) {
      strategyName = 'CustomOrder';
    } else {
      throw new Error(`Unknown allocation strategy: ${strategy}`);
    }
    return strategyName;
  }

  processDeposits(currentDate: LocalDate): PaymentApplicationResult[] {
    const results: PaymentApplicationResult[] = [];

    this.deposits.sortByEffectiveDate();
    this.bills.sortBills();

    for (const deposit of this.deposits.all) {
      if (deposit.active !== true) {
        // console.debug(`Skipping deposit ${deposit.id} because it is not active`);
        continue;
      }
      if (deposit.isAdhocRefund) {
        continue;
      }
      // if effective date is after the current date, skip the deposit
      if (deposit.effectiveDate.isAfter(currentDate)) {
        // console.debug(`Skipping deposit ${deposit.id} because its effective date is after the current date`);
        continue;
      }
      const result = this.applyDeposit(currentDate, deposit, {
        allocationStrategy: this.allocationStrategy,
        paymentPriority: this.paymentPriority,
      });
      results.push(result);
    }

    // For DSI loans, handle unpaid bills to set actual balances
    if (this.billingModel === 'dailySimpleInterest') {
      this.handleUnpaidDSIBills(currentDate);
    }

    return results;
  }

  applyDeposit(
    currentDate: LocalDate,
    deposit: DepositRecord,
    options?: {
      allocationStrategy?: AllocationStrategy;
      paymentPriority?: PaymentPriority;
    }
  ): PaymentApplicationResult {
    options ??= {};
    options.allocationStrategy ??= this.allocationStrategy;
    options.paymentPriority ??= this.paymentPriority;

    // Check if this is a DSI loan
    const isDSILoan = this.billingModel === 'dailySimpleInterest';

    // DSI-aware payment application
    if (isDSILoan) {
      // For DSI loans, calculate actual interest based on payment date
      const result = options.allocationStrategy.apply(currentDate, deposit, this.bills, options.paymentPriority);
      
      // After applying payment, calculate DSI-specific values
      // Sort allocations by term to ensure we process them in order
      const sortedAllocations = result.allocations.sort((a, b) => {
        const termA = a.bill?.amortizationEntry?.term || 0;
        const termB = b.bill?.amortizationEntry?.term || 0;
        return termA - termB;
      });
      
      for (const allocation of sortedAllocations) {
        const bill = allocation.bill;
        if (bill && bill.amortizationEntry) {
          const entry = bill.amortizationEntry;
          const paymentDate = deposit.effectiveDate;
          const dueDate = bill.dueDate;
          
          // First, establish the actual DSI start balance for this term
          // For DSI, we always recalculate the start balance based on payment history
          // This ensures cascading balances work correctly
          if (true) { // Always recalculate for DSI
            if (entry.term === 0) {
              entry.actualDSIStartBalance = entry.startBalance;
            } else {
              // Check payment history first
              const prevPaymentHistory = this.amortization.getDSIPaymentHistory(entry.term - 1);
              
              if (prevPaymentHistory && prevPaymentHistory.actualEndBalance) {
                entry.actualDSIStartBalance = prevPaymentHistory.actualEndBalance;
              } else {
                // Check previous entry in the schedule that has been processed in this batch
                const prevEntry = this.amortization.repaymentSchedule.entries[entry.term - 1];
                if (prevEntry && prevEntry.actualDSIEndBalance) {
                  entry.actualDSIStartBalance = prevEntry.actualDSIEndBalance;
                } else {
                  // Use original projected start balance
                  entry.actualDSIStartBalance = entry.startBalance;
                }
              }
            }
          }
          
          // Get the annual rate and calculate daily rate based on calendar
          const annualRate = this.amortization.annualInterestRate;
          const calendar = entry.calendar;
          const daysInYear = calendar.daysInYear();
          const dailyRate = annualRate.toNumber() / daysInYear;
          
          // Use the actual DSI start balance for interest calculation
          const principalBalance = entry.actualDSIStartBalance;
          
          // For DSI, calculate actual interest days based on payment history
          let actualDaysForInterest: number;
          let previousPaymentDate: LocalDate;
          
          if (entry.term === 0) {
            // First term: calculate days from loan start to payment date
            previousPaymentDate = entry.periodStartDate;
            actualDaysForInterest = calendar.daysBetween(previousPaymentDate, paymentDate);
          } else {
            // Subsequent terms: calculate days from previous payment date to current payment date
            const prevEntry = this.amortization.repaymentSchedule.entries[entry.term - 1];
            if (prevEntry && prevEntry.dsiPreviousPaymentDate) {
              previousPaymentDate = prevEntry.dsiPreviousPaymentDate;
            } else {
              // Fallback to previous term's end date
              previousPaymentDate = prevEntry ? prevEntry.periodEndDate : entry.periodStartDate;
            }
            actualDaysForInterest = calendar.daysBetween(previousPaymentDate, paymentDate);
          }
          
          // Calculate actual interest
          const actualInterest = principalBalance.multiply(dailyRate).multiply(actualDaysForInterest);
          
          // For DSI, the actual interest is what we calculated, not what was allocated
          entry.actualDSIInterest = actualInterest;
          
          // The principal payment is the total payment minus the actual interest and fees
          const totalPayment = allocation.allocatedInterest.add(allocation.allocatedPrincipal).add(allocation.allocatedFees);
          const actualPrincipal = totalPayment.subtract(actualInterest).subtract(allocation.allocatedFees);
          
          entry.actualDSIPrincipal = actualPrincipal;
          entry.actualDSIFees = Currency.of(allocation.allocatedFees.toNumber());
          // Calculate end balance: start - principal paid
          entry.actualDSIEndBalance = entry.actualDSIStartBalance.subtract(entry.actualDSIPrincipal);
          
          // Set the actual DSI interest days for this payment
          entry.dsiInterestDays = actualDaysForInterest;
          
          // Update the payment date on the entry for DSI interest duration tracking
          entry.dsiPreviousPaymentDate = paymentDate;
          
          // Store in amortization's DSI payment history for future recalculations
          this.amortization.updateDSIPaymentHistory(
            entry.term,
            entry.actualDSIStartBalance,
            entry.actualDSIEndBalance,
            paymentDate,
            entry.actualDSIInterest,
            entry.actualDSIPrincipal,
            entry.actualDSIFees,
            entry.dsiInterestDays
          );
          
          // DSI interest savings/penalty will be calculated during re-amortization
          // when we have the re-amortized interest values available
        }
      }
      
      return result;
    }

    // Fallback to allocation strategy
    const result = options.allocationStrategy.apply(currentDate, deposit, this.bills, options.paymentPriority);
    
    // DSI-specific usage detail patching
    if (isDSILoan) {
      for (const alloc of result.allocations) {
        const bill = alloc.bill;
        if (!bill) continue;
        if (this.isDSIBill(bill)) {
          if (!alloc.usageDetails) continue;
          for (const ud of alloc.usageDetails) {
            if (bill.amortizationEntry && bill.amortizationEntry.actualDSIInterest) {
              ud.allocatedInterest = bill.amortizationEntry.actualDSIInterest;
            }
            if (bill.amortizationEntry && bill.amortizationEntry.actualDSIPrincipal) {
              ud.allocatedPrincipal = bill.amortizationEntry.actualDSIPrincipal;
            }
            if (bill.amortizationEntry && bill.amortizationEntry.actualDSIFees) {
              ud.allocatedFees = bill.amortizationEntry.actualDSIFees;
            }
            if (bill.amortizationEntry.dsiInterestSavings !== undefined) {
              (ud as any).dsiInterestSavings = bill.amortizationEntry.dsiInterestSavings;
            }
            if (bill.amortizationEntry.dsiInterestPenalty !== undefined) {
              (ud as any).dsiInterestPenalty = bill.amortizationEntry.dsiInterestPenalty;
            }
          }
        }
      }
    }

    // Handle excess principal for non-DSI loans
    if (!isDSILoan) {
      /* Nothing left to apply → we're done */
      if (!deposit.applyExcessToPrincipal || result.unallocatedAmount.isZero()) {
        return result;
      }

      /* ── step 1  Clamp excess to remaining principal (pay-off safety) ─── */
      const summary = this.bills.summary;
      let excessAmount = Currency.of(result.unallocatedAmount);
      let isPayoff = false;

      if (excessAmount.greaterThan(summary.remainingPrincipal)) {
        excessAmount = summary.remainingPrincipal;
        result.unallocatedAmount = result.unallocatedAmount.subtract(excessAmount);
        isPayoff = true;
      } else if (excessAmount.equals(summary.remainingPrincipal)) {
        isPayoff = true;
        result.unallocatedAmount = Currency.zero;
      } else {
        result.unallocatedAmount = Currency.zero;
      }

      if (excessAmount.isZero()) {
        return result; // nothing to book
      }

      /* ── step 2  Figure out *when* the principal bump happens ──────────── */
      const dateToApply = this.determineBalanceModificationDate(deposit);

      /* ── step 3  Reuse or create ONE balance-mod per deposit ───────────── */
      let bm = this.amortization.balanceModifications.getByDepositId(deposit.id);
      let bmChanged = false;

      if (bm) {
        /* just mutate the existing record */
        if (!bm.amount.equals(excessAmount) || !bm.date.isEqual(dateToApply)) {
          bm.amount = excessAmount;
          bm.date = dateToApply;
          bmChanged = true;
        }
      } else {
        /* Create a NEW system balance-mod record */
        bm = new BalanceModification({
          id: uuidv4(),
          type: 'decrease',
          date: dateToApply,
          amount: excessAmount,
          description: 'Excess deposit applied to principal',
          isSystemModification: true,
          metadata: {
            depositId: deposit.id,
          },
        });
        this.amortization.balanceModifications.addBalanceModification(bm);
        bmChanged = true;
      }

      /* ── step 4  Book the usage detail into the deposit ─────────────────── */
      const already = deposit.usageDetails.some(
        (ud) =>
          ud.billId === 'Principal Prepayment' &&
          ud.billDueDate.isEqual(dateToApply) &&
          ud.allocatedPrincipal.equals(excessAmount)
      );

      if (!already) {
        deposit.addUsageDetail(
          new UsageDetail({
            billId: 'Principal Prepayment',
            period: 0,
            billDueDate: dateToApply,
            allocatedPrincipal: excessAmount,
            allocatedInterest: 0,
            allocatedFees: 0,
            date: dateToApply,
            balanceModification: bm,
          })
        );
      }

      /* ── step 5  Refresh amortisation & bills, then return ─────────────── */
      if (isPayoff) {
        if (!this.amortization.payoffDate) {
          this.amortization.payoffDate = dateToApply;
        } else if (this.amortization.payoffDate.isBefore(dateToApply)) {
          this.amortization.payoffDate = dateToApply;
        } else {
          // do nothing
        }
      }
      this.amortization.calculateAmortizationPlan();
      this.bills.regenerateBillsAfterDate(dateToApply);
    }

    return result;
  }

  private isDSIBill(bill: Bill): boolean {
    return !!(
      bill.amortizationEntry &&
      (bill.amortizationEntry.actualDSIPrincipal ||
        bill.amortizationEntry.actualDSIInterest ||
        bill.amortizationEntry.actualDSIFees)
    );
  }

  private determineBalanceModificationDate(deposit: DepositRecord): LocalDate {
    const excessAppliedDate = deposit.excessAppliedDate || deposit.effectiveDate;
    if (!excessAppliedDate) {
      throw new Error(`Deposit ${deposit.id} has no effective date or excess applied date.`);
    }
    const depositEffectiveDate = deposit.effectiveDate;
    const excessAppliedLocalDate = excessAppliedDate;
    const openBillsAtDepositDate = this.bills.all
      .filter(
        (bill) =>
          bill.isOpen(this.currentDate) &&
          (bill.dueDate.isEqual(depositEffectiveDate) || bill.dueDate.isAfter(depositEffectiveDate)) &&
          (bill.openDate.isEqual(depositEffectiveDate) || bill.openDate.isBefore(depositEffectiveDate))
      )
      .sort((a, b) => ChronoUnit.DAYS.between(a.openDate, b.openDate));
    let balanceModificationDate: LocalDate;
    if (deposit.applyExcessAtTheEndOfThePeriod === true && openBillsAtDepositDate.length > 0) {
      const firstOpenBill = openBillsAtDepositDate[0];
      const nextTermStartDate = firstOpenBill.amortizationEntry.periodEndDate;
      balanceModificationDate = nextTermStartDate;
    } else {
      balanceModificationDate = depositEffectiveDate.isAfter(excessAppliedLocalDate)
        ? depositEffectiveDate
        : excessAppliedLocalDate;
    }
    return balanceModificationDate;
  }

  private generateUniqueId(): string {
    return uuidv4();
  }

  private handleUnpaidDSIBills(currentDate: LocalDate): void {
    // Check all bills that are due but not paid
    for (const bill of this.bills.all) {
      if (bill.isDue(currentDate) && !bill.isPaid() && bill.amortizationEntry) {
        const entry = bill.amortizationEntry;
        
        // If DSI balances haven't been set yet, set them
        if (!entry.actualDSIStartBalance) {
          // For DSI, use actual balance from previous term if available
          if (entry.term > 0) {
            const prevPaymentHistory = this.amortization.getDSIPaymentHistory(entry.term - 1);
            if (prevPaymentHistory) {
              entry.actualDSIStartBalance = prevPaymentHistory.actualEndBalance;
            } else {
              entry.actualDSIStartBalance = entry.startBalance;
            }
          } else {
            entry.actualDSIStartBalance = entry.startBalance;
          }
        }
        
        // If no payment was made, end balance equals start balance
        if (!entry.actualDSIEndBalance) {
          entry.actualDSIEndBalance = entry.actualDSIStartBalance;
          
          // Calculate DSI interest days for unpaid term
          if (entry.term === 0) {
            // First term unpaid: use standard days in period
            entry.dsiInterestDays = entry.daysInPeriod;
          } else {
            // Subsequent terms: calculate from previous payment/due date
            const prevEntry = this.amortization.repaymentSchedule.entries[entry.term - 1];
            if (prevEntry && prevEntry.dsiPreviousPaymentDate) {
              entry.dsiInterestDays = entry.calendar.daysBetween(prevEntry.dsiPreviousPaymentDate, entry.periodBillDueDate);
            } else {
              // Fallback to standard days
              entry.dsiInterestDays = entry.daysInPeriod;
            }
          }
          
          // For DSI interest duration tracking, use the due date as the "payment" date
          // This ensures the next term calculates interest from the correct date
          entry.dsiPreviousPaymentDate = entry.periodBillDueDate;
          
          // Store in amortization's DSI payment history
          this.amortization.updateDSIPaymentHistory(
            entry.term,
            entry.actualDSIStartBalance,
            entry.actualDSIEndBalance,
            entry.periodBillDueDate,
            Currency.zero, // No interest paid
            Currency.zero, // No principal paid
            Currency.zero, // No fees paid
            entry.dsiInterestDays
          );
          
          // Calculate penalty interest for the unpaid term
          const dailyRate = this.amortization.annualInterestRate.toNumber() / 365;
          const daysInPeriod = entry.daysInPeriod;
          const expectedInterest = entry.actualDSIStartBalance.multiply(dailyRate).multiply(daysInPeriod);
          
          // Set actual values to show no payment was made
          entry.actualDSIPrincipal = Currency.zero;
          entry.actualDSIInterest = Currency.zero;
          entry.actualDSIFees = Currency.zero;
          
          // The entire expected interest becomes a penalty
          entry.dsiInterestPenalty = expectedInterest.toNumber();
          entry.dsiInterestSavings = 0;
        }
      }
    }
  }
}
