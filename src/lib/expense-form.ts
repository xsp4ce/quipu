export type CategoryOption = {
	id: string;
	name: string;
};

export type ExpenseFormValues = {
	currency: string;
	amount: string;
	categoryId: string;
	description: string;
	occurredAt: string;
};

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;
