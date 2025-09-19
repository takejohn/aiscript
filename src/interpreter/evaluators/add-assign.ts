import { NULL, NUM } from '../value.js';
import { isControl } from '../control.js';
import { assertNumber } from '../util.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationStepResult } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';

function evalAddAssign(node: Ast.AddAssign, scope: Scope): EvaluationStepResult {
	return instructions.evaluateReference(node.dest, scope, (target) => {
		if (isControl(target)) {
			return instructions.end(target);
		}

		return instructions.eval(node.expr, scope, (v) => {
			if (isControl(v)) {
				return instructions.end(v);
			}
			assertNumber(v);
			const targetValue = target.get();
			assertNumber(targetValue);

			target.set(NUM(targetValue.value + v.value));
			return instructions.end(NULL);
		});
	});
}

export const AddAssignEvaluator = evaluationStepsToEvaluator(evalAddAssign);
