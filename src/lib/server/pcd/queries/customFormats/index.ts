/**
 * Custom Format queries and mutations
 */

// Export all types
export type { CustomFormatTableRow, ConditionRef, CustomFormatBasic, CustomFormatGeneral, CustomFormatTest } from './types.ts';
export type { CreateTestInput, CreateTestOptions } from './testCreate.ts';
export type { UpdateTestInput, UpdateTestOptions } from './testUpdate.ts';
export type { DeleteTestOptions } from './testDelete.ts';
export type { ConditionData } from './conditions.ts';
export type { ConditionListItem } from './listConditions.ts';
export type { ConditionResult, EvaluationResult, ParsedInfo } from './evaluator.ts';
export type { UpdateGeneralInput, UpdateGeneralOptions } from './updateGeneral.ts';
export type { UpdateConditionsOptions } from './updateConditions.ts';
export type { CreateCustomFormatInput, CreateCustomFormatOptions } from './create.ts';
export type { DeleteCustomFormatOptions } from './delete.ts';

// Export query functions (reads)
export { list } from './list.ts';
export { general } from './general.ts';
export { getById, listTests, getTestById } from './tests.ts';
export { getConditionsForEvaluation } from './conditions.ts';
export { listConditions } from './listConditions.ts';
export { evaluateCustomFormat, getParsedInfo } from './evaluator.ts';

// Export mutation functions (writes via PCD operations)
export { create } from './create.ts';
export { remove } from './delete.ts';
export { createTest } from './testCreate.ts';
export { updateTest } from './testUpdate.ts';
export { deleteTest } from './testDelete.ts';
export { updateGeneral } from './updateGeneral.ts';
export { updateConditions } from './updateConditions.ts';
