import { NULL } from '../../value.js';
import { isControl, unWrapLabeledBreak } from '../../control.js';
import { assertBoolean } from '../../util.js';
import { evalClause } from '../utils.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

function evalIf(node: Ast.If, scope: Scope): EvaluationStepResult {
	function evalStart(): EvaluationStepResult {
		return instructions.eval(node.cond, scope, (cond) => {
			if (isControl(cond)) {
				return instructions.end(cond);
			}
			assertBoolean(cond);
			if (cond.value) {
				return evalClause(node.then, scope, (value) => {
					return instructions.end(unWrapLabeledBreak(value, node.label));
				});
			}
			return evalElseif(node.elseif.values());
		});
	}

	function evalElseif(elseifIterator: Iterator<Ast.If['elseif'][number]>): EvaluationStepResult {
		const elseifResult = elseifIterator.next();
		if (elseifResult.done) {
			return evalElse();
		}

		const elseif = elseifResult.value;
		return instructions.eval(elseif.cond, scope, (cond) => {
			if (isControl(cond)) {
				return instructions.end(cond);
			}
			assertBoolean(cond);
			if (cond.value) {
				return evalClause(elseif.then, scope, (value) => {
					return instructions.end(unWrapLabeledBreak(value, node.label));
				});
			}
			return evalElseif(elseifIterator);
		});
	}

	function evalElse(): EvaluationStepResult {
		if (node.else) {
			return evalClause(node.else, scope, (value) => {
				return instructions.end(unWrapLabeledBreak(value, node.label));
			});
		}
		return instructions.end(NULL);
	}

	return evalStart();
}

export const IfEvaluator = evaluationStepsToEvaluator(evalIf);
