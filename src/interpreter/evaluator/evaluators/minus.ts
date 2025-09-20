import { NUM } from '../../value.js';
import { isControl } from '../../control.js';
import { assertNumber } from '../../util.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { Control } from '../../control.js';
import type { Value } from '../../value.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalMinus(node: Ast.Minus, scope: Scope): EvaluationStepResult {
	return instructions.eval<Value | Control>(node.expr, scope, (v) => {
		if (isControl(v)) {
			return instructions.end(v);
		}
		assertNumber(v);
		return instructions.end(NUM(-v.value));
	});
}

export const MinusEvaluator = evaluationStepsToEvaluator(evalMinus);
