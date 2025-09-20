import { NULL } from '../../value.js';
import { isControl } from '../../control.js';
import { assertArray } from '../../util.js';
import { define } from '../../define.js';
import { instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

export function evalEach(node: Ast.Each, scope: Scope): EvaluationStepResult {
	return instructions.eval(node.items, scope, (items) => {
		if (isControl(items)) {
			return instructions.end(items);
		}
		assertArray(items);

		const itemsIterator = items.value.values();
		const executeBody = (): EvaluationStepResult => {
			const itemResult = itemsIterator.next();
			if (itemResult.done) {
				return instructions.end(NULL);
			}

			const item = itemResult.value;
			const eachScope = scope.createChildScope();
			define(eachScope, node.var, item, false);
			return instructions.eval(node.for, eachScope, (v) => {
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

				return executeBody();
			});
		};
		return executeBody();
	});
}

