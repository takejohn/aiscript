import { isControl, RETURN } from '../../control.js';
import { instructions } from '../step.js';
import type { Logger } from '../../logger.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

export function evalReturn(node: Ast.Return, scope: Scope, logger: Logger): EvaluationStepResult {
	return instructions.eval(node.expr, scope, (val) => {
		if (isControl(val)) {
			return instructions.end(val);
		}
		logger('block:return', { scope: scope.name, val: val });
		return instructions.end(RETURN(val));
	});
}
