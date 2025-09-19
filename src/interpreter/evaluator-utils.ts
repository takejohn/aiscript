import { Ast } from '../index.js';
import { isControl, type Control } from './control.js';
import { instructions } from './evaluator.js';
import type { EvaluationStepResult } from './evaluator.js';
import type { Scope } from '../index.js';
import type { Value } from './value.js';

export function evalClause(node: Ast.Statement | Ast.Expression, scope: Scope, then: (value: Value | Control) => EvaluationStepResult): EvaluationStepResult {
	return instructions.eval(node, Ast.isStatement(node) ? scope.createChildScope() : scope, then);
}

export function evalList(list: Ast.Expression[], scope: Scope, then: (value: Value[]) => EvaluationStepResult): EvaluationStepResult {
	const value: Value[] = [];
	const valueExprs = list.values();

	function evaluateItems(): EvaluationStepResult {
		const expr = valueExprs.next();
		if (expr.done) {
			return then(value);
		}

		return instructions.eval(expr.value, scope, (valueItem) => {
			if (isControl(valueItem)) {
				return instructions.end(valueItem);
			}
			value.push(valueItem);
			return evaluateItems();
		});
	}

	return evaluateItems();
}
