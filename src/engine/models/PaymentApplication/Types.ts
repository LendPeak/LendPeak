// Payment components
export type PaymentComponent = "interest" | "fees" | "principal";
export type PaymentAllocationStrategyName = "FIFO" | "LIFO" | "EqualDistribution" | "CustomOrder";

// Payment priority configuration
export type PaymentPriority = PaymentComponent[];
