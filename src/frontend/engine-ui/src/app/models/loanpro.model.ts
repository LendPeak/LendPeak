import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { DateUtil } from 'lendpeak-engine/utils/DateUtil';

dayjs.extend(utc);
dayjs.extend(timezone);

export function parseODataDate(dateString: string, isUTC?: boolean): Date {
  if (isUTC !== true) {
    isUTC = false;
  }
  const timestamp = parseInt(
    dateString.replace('/Date(', '').replace(')/', ''),
    10,
  );

  let dateToReturn: Date;
  if (isUTC) {
    dateToReturn = dayjs
      .utc(timestamp * 1000)
      .hour(12)
      .toDate();
  } else {
    // if it is not UTC it is pacific time
    dateToReturn = dayjs(timestamp * 1000)
      .hour(12)
      .toDate();
  }

  //   console.log(
  //     `TIME: timestamp: ${timestamp} dateString: ${dateString} dateToReturn: ${dateToReturn.toISOString()}`,
  //   );
  return dateToReturn;
}

export interface LoanResponse {
  d: LoanData;
}

export interface LoanData {
  __metadata: Metadata;
  Insurance: Deferred;
  CustomFieldValues: Deferred;
  ChecklistItemValues: Deferred;
  Documents: Deferred;
  Collateral: Deferred;
  LoanSettings: LoanSettings;
  LoanSetup: LoanSetup;

  Notes: Deferred;
  Promises: Deferred;
  Bankruptcies: Deferred;
  Charges: Deferred;
  Payments: Payment[];
  DueDateChanges: DueDateChange[];
  ScheduleRolls: ScheduleRoll[];
  InterestAdjustments: InterestAdjustment[];
  Transactions: Transaction[];
  StopInterestDates: StopInterestDates[];

  // Core properties
  id: number;
  displayId: string;
  title: string;
  settingsId: number;
  setupId: number;
  insurancePolicyId: number | null;
  collateralId: number;
  linkedLoan: number | null;
  modId: number | null;
  modTotal: number;
  humanActivityDate: string;
  created: string;
  lastMaintRun: string;
  createdBy: number;
  active: number;
  archived: number;
  loanAlert: string | null;
  temporaryAccount: number;
  deleted: number;
  deletedAt: string | null;
  _relatedMetadata: any;
  _dynamicProperties: any;
}

export interface Metadata {
  uri: string;
  type: string;
}

export interface Deferred {
  __deferred: {
    uri: string;
  };
}

export interface InterestAdjustment {
  id: number;
  entityType: 'Entity.Loan';
  entityId: number; // 4500;
  modId: string; //  null;
  title: string; // 'LPT-002517043 Interest Adjustment';
  date: string; // '/Date(1619136000)/';
  type: 'loan.interest.adjust.type.increase';
  amount: string; // '372.67';
  categoryId: string; // '1';
  importId: null;
}

export interface LoanSettings {
  __metadata: Metadata;
  Loan: Deferred;
  LoanStatus: Deferred;
  LoanSubStatus: Deferred;
  CustomFieldValues: Deferred;
  SrcCompany: Deferred;
  MerchantProcessorGroup: Deferred;
  id: number;
  loanId: number;
  cardFeeAmount: string;
  cardFeeType: string;
  cardFeePercent: string;
  agent: number;
  loanStatusId: number;
  loanSubStatusId: number;
  sourceCompany: number;
  paymentTypeDefault: number;
  eBilling: number;
  ECOACode: string;
  coBuyerECOACode: string;
  creditStatus: string;
  creditBureau: string;
  reportingType: string;
  secured: number;
  autopayEnabled: number;
  repoDate: string;
  closedDate: string;
  liquidationDate: string;
  followUpDate: string;
  isStoplightManuallySet: number;
  merchantProcessorGroupId: number;
  extraTowardsTransactions: string;
  extraTowardsPeriods: string;
}

export interface LoanSetup {
  __metadata: Metadata;
  CustomFieldValues: Deferred;
  id: number;
  loanId: number;
  modId: number;
  active: number;
  apr: string;
  aprForceSingle: number;
  payment: string;
  origFinalPaymentDate: string;
  origFinalPaymentAmount: string;
  tilFinanceCharge: string;
  tilTotalOfPayments: string;
  tilLoanAmount: string;
  tilSalesPrice: string;
  tilPaymentSchedule: string;
  regzCustomEnabled: number;
  regzApr: string;
  regzFinanceCharge: string;
  regzAmountFinanced: string;
  regzTotalOfPayments: string;
  loanAmount: string;
  discount: string;
  underwriting: string;
  loanRate: string;
  loanRateType: string;
  loanTerm: string;
  moneyFactor: string;
  residual: string;
  contractDate: string;
  firstPaymentDate: string;
  scheduleRound: string;
  amountDown: string;
  reserve: string;
  salesPrice: string;
  gap: string;
  warranty: string;
  dealerProfit: string;
  taxes: string;
  creditLimit: string;
  reportingCreditLimit: string;
  loanClass: string;
  loanType: string;
  discountSplit: number;
  paymentFrequency: string;
  calcType: string;
  daysInYear: string;
  interestApplication: string;
  begEnd: string;
  firstPeriodDays: string;
  firstDayInterest: number;
  discountCalc: string;
  diyAlt: number;
  dueDateOnLastDOM: number;
  dueDatesOnBusinessDays: string;
  daysInPeriod: string;
  roundDecimals: number;
  lastAsFinal: number;
  nddCalc: string;
  endInterest: string;
  scheduleTemplate: number;
  curtailmentTemplate: number;
  feesPaidBy: string;
  useInterestTiers: number;
  calcHistoryEnabled: number;
  calcDatesEnabled: number;
  graceDays: number;
  lateFeeType: string;
  lateFeeAmount: string;
  lateFeePercent: string;
  lateFeeCalc: string;
  lateFeePercentBase: string;
  rollLastPayment: number;
  paymentDateApp: string;
  suspendForecastTo: string | null;
  isSetupValid: boolean;
  usuryAlert: string | null;
  maxInterestAmount: string | null;
  financeChargeAsMIA: number;
  actual360Base: number;
  includesFinalDayInterest: number;
  loanRateMethod: string | null;
  variableInterestIndexId: number | null;
  variableLookupDate: string | null;
  variableMargin: string | null;
  variableMax: string | null;
  variableMin: string | null;
}

export interface PaymentsCollection {
  results: Payment[];
  __next?: string;
}

export interface Payment {
  __metadata: Metadata;
  Loan: Deferred;
  PaymentType: Deferred;
  APDAdjustment: Deferred;
  DPDAdjustment: Deferred;
  PaymentAccount: Deferred;
  PaymentMethod: Deferred;
  PaymentInfo: Deferred;
  PaymentReverseTx: Deferred;
  LinkedInfo: Deferred;
  ChargeOff: Deferred;
  Portfolios: Deferred;
  SubPortfolios: Deferred;
  LoanStatus: Deferred;
  LoanSubStatus: Deferred;
  SourceCompany: Deferred;
  CashDrawerTransaction: Deferred;
  ChildPayment: Deferred;
  ParentPayment: Deferred;
  CustomFieldValues: Deferred;
  TransactionChilds: Deferred;
  id: number;
  displayId: number;
  paymentInfoId: number | null;
  paymentTypeId: number;
  paymentMethodId: number;
  paymentAccountId: number | null;
  entityType: string;
  entityId: number;
  modId: number | null;
  cashDrawerId: number | null;
  cashDrawerTxId: number | null;
  cashDrawerTxStatus: string | null;
  cashDrawerTerminalNumber: string | null;
  txSnapshotId: number | null;
  amount: string;
  extra: string;
  lastExtra: string | null;
  early: number;
  payoffFlag: number;
  payoffApplyDiffAs: string | null;
  payoffOptions: string | null;
  customApplication: string;
  info: string;
  date: string;
  chargeFeeType: string;
  chargeFeeAmount: string;
  chargeFeePercentage: string;
  echeckAuthType: string;
  parentId: number | null;
  childId: number | null;
  status: string;
  reverseReason: string | null;
  reverseDate: string | null;
  comments: string | null;
  loanStatusId: number;
  loanSubStatusId: number;
  sourceCompanyId: number;
  beforePrincipalBalance: string;
  beforePayoff: string;
  beforeNextDueDate: string;
  beforeNextDueAmount: string;
  beforeAmountPastDue: string;
  beforeDaysPastDue: number;
  afterPrincipalBalance: string;
  afterPayoff: string;
  afterNextDueDate: string;
  afterNextDueAmount: string;
  afterAmountPastDue: string;
  afterDaysPastDue: number;
  systemComments: string;
  chargeOffRecovery: number;
  resetPastDue: number;
  apdAdjustmentId: number;
  dpdAdjustmentId: number;
  paymentMethodOption: string | null;
  paymentMethodName: string | null;
  isSplit: number | null;
  splitId: number | null;
  nachaReturnCode: string | null;
  active: number;
  created: string;
  reportExtendedData: any;
  createdBy: number | null;
  autopayId: number | null;
}

export interface DueDateChange {
  __metadata: Metadata;
  id: number;
  entityType: string;
  entityId: number;
  modId: number | null;
  originalDate: string; // e.g. "/Date(1700784000)/"
  newDate: string; // e.g. "/Date(1703721600)/"
  changedDate: string; // e.g. "/Date(1703376000)/"
  dueDateOnLastDOM: number;
}

export interface ScheduleRoll {
  __metadata: Metadata;
  id: number;
  entityType: string;
  entityId: number;
  modId: number | null;
  term: number;
  rate: string;
  solveUsing: string;
  amount: string;
  interestOnlyOffSetDays: number | null;
  percent: string;
  advancedTerms: string;
  solveFor: string;
  balance: string;
  balanceSet: string;
  difference: string;
  forceBalloon: number;
  basicRevert: number;
  displayOrder: number;
  isCurtailment: number;
  lastAsFinal: number;
}

/*
{
                "__metadata": {
                    "uri": "https://happymoney.simnang.com/api/public/api/1/odata.svc/StopInterestDates(id=250450)",
                    "type": "Entity.StopInterestDate"
                },
                "id": 250450,
                "entityType": "Entity.Loan",
                "entityId": 136290,
                "modId": null,
                "date": "/Date(1535414400)/",
                "type": "loan.stopInterestType.suspend"
            }
*/
export interface StopInterestDates {
  id: number;
  entityType: string;
  entityId: number;
  modId: number | null;
  date: string; // e.g. "/Date(1535414400)/"
  type: 'loan.stopInterestType.suspend' | 'loan.stopInterestType.resume';
}

export interface Transaction {
  id: number; // Example: 567006
  txId: string; // Example: '4500-0-info-int-adj-60051'
  entityType: string; // Example: 'Entity.Loan'
  entityId: number; // Example: 4500
  modId: number; // Example: 0
  date: string; // Example: '/Date(1619136000)/'
  period: number; // Example: 0
  periodStart: string; // Example: '/Date(-62169984000)/'
  periodEnd: string; // Example: '/Date(-62169984000)/'
  title: string; // Example: 'Interest Adjustment'
  type: 'intAdjustment' | 'scheduledPayment' | 'payment'; // Example: 'intAdjustment'
  infoOnly: number; // Example: 1
  infoDetails: string; // Example: '{"type":"increase","amount":"372.67"}'
  paymentId: number; // Example: 0
  paymentDisplayId: number; // Example: 0
  paymentAmount: string; // Example: '0'
  paymentInterest: string; // Example: '0'
  paymentPrincipal: string; // Example: '0'
  paymentDiscount: string; // Example: '0'
  paymentFees: string; // Example: '0'
  feesPaidDetails: any; // Example: null
  paymentEscrow: string; // Example: '0'
  paymentEscrowBreakdown: any; // Example: null
  chargeAmount: string; // Example: '0'
  chargeInterest: string; // Example: '0'
  chargePrincipal: string; // Example: '0'
  chargeDiscount: string; // Example: '0'
  chargeFees: string; // Example: '0'
  chargeEscrow: string; // Example: '0'
  chargeEscrowBreakdown: any; // Example: null
  future: number; // Example: 0
  principalOnly: number; // Example: 0
  advancement: number; // Example: 0
  payoffFee: number; // Example: 0
  chargeOff: number; // Example: 0
  paymentType: number; // Example: 0
  adbDays: number; // Example: 0
  adb: string; // Example: '0'
  principalBalance: string; // Example: '0'
  displayOrder: string; // Example: '0'
}
