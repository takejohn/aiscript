import { ARR } from '../../value.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import { evalList } from '../utils.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalArr(node: Ast.Arr, scope: Scope): EvaluationStepResult {
	return evalList(node.value, scope, (value) => {
		return instructions.end(ARR(value));
	});
}

export const ArrEvaluator = evaluationStepsToEvaluator(evalArr);
