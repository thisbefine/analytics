const MAX_STRING_LENGTH = 500;
const MAX_EVENT_NAME_LENGTH = 200;
const MAX_PROPERTIES_SIZE = 32 * 1024;

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

export const isNonEmptyString = (value: unknown): value is string => {
	return typeof value === "string" && value.trim().length > 0;
};

export const validateEventName = (event: unknown): ValidationResult => {
	if (!isNonEmptyString(event)) {
		return { valid: false, error: "Event name must be a non-empty string" };
	}
	if (event.length > MAX_EVENT_NAME_LENGTH) {
		return {
			valid: false,
			error: `Event name exceeds ${MAX_EVENT_NAME_LENGTH} characters`,
		};
	}
	return { valid: true };
};

export const validateUserId = (userId: unknown): ValidationResult => {
	if (!isNonEmptyString(userId)) {
		return { valid: false, error: "User ID must be a non-empty string" };
	}
	if (userId.length > MAX_STRING_LENGTH) {
		return {
			valid: false,
			error: `User ID exceeds ${MAX_STRING_LENGTH} characters`,
		};
	}
	if (
		userId === "undefined" ||
		userId === "null" ||
		userId === "[object Object]"
	) {
		return { valid: false, error: `Invalid user ID: "${userId}"` };
	}
	return { valid: true };
};

export const validateAccountId = (accountId: unknown): ValidationResult => {
	if (!isNonEmptyString(accountId)) {
		return { valid: false, error: "Account ID must be a non-empty string" };
	}
	if (accountId.length > MAX_STRING_LENGTH) {
		return {
			valid: false,
			error: `Account ID exceeds ${MAX_STRING_LENGTH} characters`,
		};
	}
	if (
		accountId === "undefined" ||
		accountId === "null" ||
		accountId === "[object Object]"
	) {
		return { valid: false, error: `Invalid account ID: "${accountId}"` };
	}
	return { valid: true };
};

export const validateProperties = (properties: unknown): ValidationResult => {
	if (properties === undefined || properties === null) {
		return { valid: true };
	}

	if (typeof properties !== "object" || Array.isArray(properties)) {
		return { valid: false, error: "Properties must be an object" };
	}

	try {
		const json = JSON.stringify(properties);
		if (json.length > MAX_PROPERTIES_SIZE) {
			return {
				valid: false,
				error: `Properties exceed ${MAX_PROPERTIES_SIZE} bytes`,
			};
		}
	} catch {
		return {
			valid: false,
			error:
				"Properties contain circular references or non-serializable values",
		};
	}

	return { valid: true };
};

export const sanitizeString = (str: string, maxLength: number): string => {
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength);
};
