import { BREAK, isControl } from '../control.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationDoneResult, EvaluationStepResult, Logger } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Value } from '../value.js';
import type { Scope } from '../scope.js';

function evalBreak(node: Ast.Break, scope: Scope, logger: Logger): EvaluationStepResult {
	function breakWithValue(val: Value | undefined): EvaluationDoneResult {
		logger.log('block:break', { scope: scope.name });
		return instructions.end(BREAK(node.label, val));
	}

	if (node.expr == null) {
		return breakWithValue(undefined);
	}

	return instructions.eval(node.expr, scope, (valueOrControl) => {
		if (isControl(valueOrControl)) {
			return instructions.end(valueOrControl);
		}
		return breakWithValue(valueOrControl);
	});
}

export const BreakEvaluator = evaluationStepsToEvaluator(evalBreak);
