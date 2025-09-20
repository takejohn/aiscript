import { NULL } from '../../value.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';

function evalNop(): EvaluationStepResult {
	return instructions.end(NULL);
}

export const NopEvaluator = evaluationStepsToEvaluator(evalNop);
