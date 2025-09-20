import { isControl } from '../../control.js';
import { assertFunction } from '../../util.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import { evalList } from '../utils.js';
import type { EvaluationStepResult } from '../step.js';
import type { Scope } from '../../scope.js';
import type { Ast } from '../../../index.js';

function evalCall(node: Ast.Call, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.target, scope, (callee) => {
		if (isControl(callee)) {
			return instructions.end(callee);
		}
		assertFunction(callee);

		return evalList(node.args, scope, (args) => {
			return instructions.fn(callee, args, node.loc.start, (value) => {
				return instructions.end(value);
			});
		});
	});
}

export const CallEvaluator = evaluationStepsToEvaluator(evalCall);
