import { isControl, RETURN } from '../../control.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult, Logger } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalReturn(node: Ast.Return, scope: Scope, logger: Logger): EvaluationStepResult {
	return instructions.eval(node.expr, scope, (val) => {
		if (isControl(val)) {
			return instructions.end(val);
		}
		logger.log('block:return', { scope: scope.name, val: val });
		return instructions.end(RETURN(val));
	});
}

export const ReturnEvaluator = evaluationStepsToEvaluator(evalReturn);
