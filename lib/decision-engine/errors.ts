import type { ValidationIssue } from "./types";

export class DecisionEngineValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = "DecisionEngineValidationError";
    this.issues = issues;
  }
}

export class MissingCommercialRuleError extends Error {
  readonly rulePath: string;

  constructor(rulePath: string) {
    super(`Commercial input is unresolved: ${rulePath}`);
    this.name = "MissingCommercialRuleError";
    this.rulePath = rulePath;
  }
}
