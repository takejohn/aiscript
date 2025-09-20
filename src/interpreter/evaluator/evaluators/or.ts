import { isControl } from '../../control.js';
import { assertBoolean } from '../../util.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { Value } from '../../value.js';
import type { Control } from '../../control.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalOr(node: Ast.Or, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.left, scope, (leftValue) => {
		if (isControl(leftValue)) {
			return instructions.end(leftValue);
		}
		assertBoolean(leftValue);

		if (leftValue.value) {
			return instructions.end(leftValue);
		}

		return instructions.eval<Value | Control>(node.right, scope, (rightValue) => {
			if (isControl(rightValue)) {
				return instructions.end(rightValue);
			}
			assertBoolean(rightValue);
			return instructions.end(rightValue);
		});
	});
}

export const OrEvaluator = evaluationStepsToEvaluator(evalOr);
