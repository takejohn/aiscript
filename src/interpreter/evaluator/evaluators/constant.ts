import { BOOL, NULL, NUM, STR } from '../../value.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';

function evalNull(): EvaluationStepResult {
	return instructions.end(NULL);
}

function evalBool(node: Ast.Bool): EvaluationStepResult {
	return instructions.end(BOOL(node.value));
}

function evalNum(node: Ast.Num): EvaluationStepResult {
	return instructions.end(NUM(node.value));
}

function evalStr(node: Ast.Str): EvaluationStepResult {
	return instructions.end(STR(node.value));
}

export const ConstantEvaluator = {
	NULL: evaluationStepsToEvaluator<Ast.Null>(evalNull),
	BOOL: evaluationStepsToEvaluator(evalBool),
	NUM: evaluationStepsToEvaluator(evalNum),
	STR: evaluationStepsToEvaluator(evalStr),
};
