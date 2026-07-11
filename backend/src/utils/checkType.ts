import APIError from "../types/APIError";

/**
 * Utility function for batch checking value types.
 * Useful for checking the inputs for API requests.
 * If any mismatches are found, an APIError is thrown.
 * @returns An object with a `checkType` function and a `completeBatch` function.
 * @example
 * const { checkType, completeBatch } = batchCheckType();
 * checkType("key", value, "string");
 * checkType("key2", value2, "number", true); // can be undefined or null
 * completeBatch();
 */
export function batchCheckType() {
  let foundMismatches: any[] = [];

  function addMismatch(key: string, value: any, expectedType: string, actualType: string, options: CheckTypeOptions) {
    foundMismatches.push({
      key: key,
      value: value,
      expectedType: `${capitaliseFirstLetter(expectedType)}${options.canBeNull ? " | null" : ""}${options.canBeUndefined ? " | undefined" : ""}`,
      actualType: actualType,
    });
  }

  return {
    /**
     * Checks if the value's type matches the expected type.
     * Does not throw an error if the value is undefined or null and canBeUndefinedOrNull is true.
     * This function does **not** throw until `completeBatch` is called.
     * @param key The key of the value being checked. Used for error messages.
     * @param value The value being checked.
     * @param type The expected type of the value.
     * @param options Options for the check.
     */
    checkType: (key: string, value: any | undefined | null, type: string, options: CheckTypeOptions = defaultCheckTypeOptions) => {
      check(value, type, options, (actual: string) => addMismatch(key, value, type, actual, options));
    },
    /**
     * Completes the batch check and throws an error if any mismatches were found.
     * This function should be called after all `checkType` calls have been made.
     * @throws {APIError} If any mismatches were found. This should be allowed to cascade up the stack and be caught by the error handler.
     */
    completeBatch: () => {
      if (foundMismatches.length > 0) {
        let error = new APIError(400, "TYPE_MISMATCH", `The type of a value you sent did not match what was expected. See explanations.`);
        foundMismatches.forEach(mismatch => error.addExplanation(mismatch));
        throw error;
      }
    }
  }
}

/**
 * Checks if the value's type matches the expected type.'
 * @param key The key of the value being checked. Used for error messages.
 * @param value The value being checked.
 * @param type The expected type of the value.
 * @param options Options for the check.
 * @throws {APIError} If the value's type does not match the expected type.
 */
export function checkType(key: string, value: any, type: string, options: CheckTypeOptions = defaultCheckTypeOptions) {
  check(value, type, options, (actual: string) => {
    let error = new APIError(400, "TYPE_MISMATCH", `The type of a value you sent did not match what was expected. See explanations.`);
    error.addExplanation({
      key: key,
      value: value,
      expectedType: `${capitaliseFirstLetter(type)}${options.canBeNull ? " | null" : ""}${options.canBeUndefined ? " | undefined" : ""}`,
      actualType: actual
    });
    throw error;
  })
}

const defaultCheckTypeOptions: CheckTypeOptions = {
  canBeUndefined: false,
  canBeNull: false,
};

export interface CheckTypeOptions {
  canBeUndefined?: boolean;
  canBeNull?: boolean;
}

function check(value: any, type: string, options: CheckTypeOptions = defaultCheckTypeOptions, onFailure: (actual: string) => void) {
  options = Object.assign(defaultCheckTypeOptions, options);
  if (options.canBeUndefined && value === undefined) return;
  if (options.canBeNull && value === null) return;
  if (value === undefined) return onFailure("undefined");
  if (value === null) return onFailure("null");

  // Custom handling for date types, as invalid dates are not caught by the constructor check
  if (type.toLowerCase() === "date" && isNaN(Date.parse(value)))
    return onFailure("Invalid Date",);
  else if (type.toLowerCase() === "date") return;

  // Main constructor name check
  if (value.constructor.name.toLowerCase() !== type.toLowerCase())
    return onFailure(value.constructor.name);
}

function capitaliseFirstLetter(string: string) { return string.charAt(0).toUpperCase() + string.slice(1); }