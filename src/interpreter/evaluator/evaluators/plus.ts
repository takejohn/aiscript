import { isControl } from '../../control.js';
import { assertNumber } from '../../util.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalPlus(node: Ast.Plus, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.expr, scope, (v) => {
		if (isControl(v)) {
			return instructions.end(v);
		}
		assertNumber(v);
		return instructions.end(v);
	});
}

export const PlusEvaluator = evaluationStepsToEvaluator(evalPlus);
