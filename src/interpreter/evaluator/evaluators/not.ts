import { BOOL } from '../../value.js';
import { isControl } from '../../control.js';
import { assertBoolean } from '../../util.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalNot(node: Ast.Not, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.expr, scope, (v) => {
		if (isControl(v)) {
			return instructions.end(v);
		}
		assertBoolean(v);
		return instructions.end(BOOL(!v.value));
	});
}

export const NotEvaluator = evaluationStepsToEvaluator(evalNot);
