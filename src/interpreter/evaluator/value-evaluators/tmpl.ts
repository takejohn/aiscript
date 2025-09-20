import { STR } from '../../value.js';
import { isControl } from '../../control.js';
import { reprValue } from '../../util.js';
import { instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

export function evalTmpl(node: Ast.Tmpl, scope: Scope): EvaluationStepResult {
	let str = '';
	const exprIterator = node.tmpl.values();

	const evalExpr = (): EvaluationStepResult => {
		const xResult = exprIterator.next();
		if (xResult.done) {
			return instructions.end(STR(str));
		}

		const x = xResult.value;
		if (typeof x === 'string') {
			str += x;
			return evalExpr();
		} else {
			return instructions.eval(x, scope, (v) => {
				if (isControl(v)) {
					return instructions.end(v);
				}
				str += reprValue(v);
				return evalExpr();
			});
		}
	};

	return evalExpr();
}

