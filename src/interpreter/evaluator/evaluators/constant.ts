import { BOOL, NULL, NUM, STR } from '../../value.js';
import { instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';

export function evalNull(): EvaluationStepResult {
	return instructions.end(NULL);
}

export function evalBool(node: Ast.Bool): EvaluationStepResult {
	return instructions.end(BOOL(node.value));
}

export function evalNum(node: Ast.Num): EvaluationStepResult {
	return instructions.end(NUM(node.value));
}

export function evalStr(node: Ast.Str): EvaluationStepResult {
	return instructions.end(STR(node.value));
}
