import { OBJ } from '../../value.js';
import { isControl } from '../../control.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Value } from '../../value.js';
import type { Scope } from '../../scope.js';

function evalObj(node: Ast.Obj, scope: Scope): EvaluationStepResult {
	const obj = new Map<string, Value>();
	const kvExprs = node.value.entries();

	function evaluateKvs(): EvaluationStepResult {
		const kvExpr = kvExprs.next();
		if (kvExpr.done) {
			return instructions.end(OBJ(obj));
		}

		const [key, valueExpr] = kvExpr.value;
		return instructions.eval(valueExpr, scope, (value) => {
			if (isControl(value)) {
				return instructions.end(value);
			}
			obj.set(key, value);
			return evaluateKvs();
		});
	}

	return evaluateKvs();
}

export const ObjEvaluator = evaluationStepsToEvaluator(evalObj);
