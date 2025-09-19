import { NULL, NUM } from '../value.js';
import { isControl } from '../control.js';
import { assertNumber } from '../util.js';
import { evalClause } from '../evaluator-utils.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationStepResult } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';

function evalFor(node: Ast.For, scope: Scope): EvaluationStepResult {
	if (node.times != null) {
		return evalForTimes(node, scope);
	} else {
		return evalForRange(node, scope);
	}
}

function evalForTimes(node: Ast.For, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.times!, scope, (times) => {
		if (isControl(times)) {
			return instructions.end(times);
		}
		assertNumber(times);
		return evalBody(node, () => scope, 0, times.value);
	});
}

function evalForRange(node: Ast.For, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.from!, scope, (from) => {
		if (isControl(from)) {
			return instructions.end(from);
		}
		return instructions.eval(node.to!, scope, (to) => {
			if (isControl(to)) {
				return instructions.end(to);
			}
			assertNumber(from);
			assertNumber(to);
			return evalBody(
				node,
				(i) => scope.createChildScope(new Map([
					[node.var!, {
						isMutable: false,
						value: NUM(i),
					}],
				])),
				from.value,
				from.value + to.value,
			);
		});
	});
}

function evalBody(node: Ast.For, getScope: (i: number) => Scope, start: number, end: number): EvaluationStepResult {
	if (start >= end) {
		return instructions.end(NULL);
	}

	return evalClause(node.for, getScope(start), (v) => {
		if (v.type === 'break') {
			if (v.label != null && v.label !== node.label) {
				return instructions.end(v);
			}
			return instructions.end(NULL);
		} else if (v.type === 'continue') {
			if (v.label != null && v.label !== node.label) {
				return instructions.end(v);
			}
		} else if (v.type === 'return') {
			return instructions.end(v);
		}

		return evalBody(node, getScope, start + 1, end);
	});
}

export const ForEvaluator = evaluationStepsToEvaluator(evalFor);
