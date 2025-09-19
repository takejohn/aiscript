import { NULL } from '../value.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationStepResult } from '../evaluator.js';

function evalNop(): EvaluationStepResult {
	return instructions.end(NULL);
}

export const NopEvaluator = evaluationStepsToEvaluator(evalNop);
