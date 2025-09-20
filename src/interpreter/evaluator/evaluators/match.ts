import { NULL } from '../../value.js';
import { isControl, unWrapLabeledBreak } from '../../control.js';
import { eq } from '../../util.js';
import { evalClause } from '../utils.js';
import { evaluationStepsToEvaluator, instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Value } from '../../value.js';
import type { Scope } from '../../scope.js';

function evalMatch(node: Ast.Match, scope: Scope): EvaluationStepResult {
	function evalAbout(): EvaluationStepResult {
		return instructions.eval(node.about, scope, (about) => {
			if (isControl(about)) {
				return instructions.end(about);
			}
			return evalQs(about, node.qs.values());
		});
	}

	function evalQs(about: Value, qIterator: Iterator<Ast.Match['qs'][number]>): EvaluationStepResult {
		const qResult = qIterator.next();
		if (qResult.done) {
			return evalDefault();
		}

		const qa = qResult.value;
		return instructions.eval(qa.q, scope, (q) => {
			if (isControl(q)) {
				return instructions.end(q);
			}
			if (eq(about, q)) {
				return evalClause(qa.a, scope, (value) => {
					return instructions.end(unWrapLabeledBreak(value, node.label));
				});
			}
			return evalQs(about, qIterator);
		});
	}

	function evalDefault(): EvaluationStepResult {
		if (node.default) {
			return evalClause(node.default, scope, (value) => {
				return instructions.end(unWrapLabeledBreak(value, node.label));
			});
		}
		return instructions.end(NULL);
	}

	return evalAbout();
}

export const MatchEvaluator = evaluationStepsToEvaluator(evalMatch);
