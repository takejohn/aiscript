import { NULL } from '../../value.js';
import { instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';

export function evalNop(): EvaluationStepResult {
	return instructions.end(NULL);
}
