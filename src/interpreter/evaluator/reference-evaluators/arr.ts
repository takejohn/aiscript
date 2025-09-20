import { isControl } from '../../control.js';
import { Reference } from '../../reference.js';
import { instructions } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Control } from '../../control.js';
import type { Scope } from '../../scope.js';
import type { EvaluationStepResult } from '../step.js';

export function evalArrReference(node: Ast.Arr, scope: Scope): EvaluationStepResult<Reference | Control> {
	const items: Reference[] = [];
	const itemIterator = node.value.values();

	function evaluateItems(): EvaluationStepResult<Reference | Control> {
		const itemResult = itemIterator.next();
		if (itemResult.done) {
			return instructions.end(Reference.arr(items));
		}

		return instructions.evaluateReference(itemResult.value, scope, (ref) => {
			if (isControl(ref)) {
				return instructions.end(ref);
			}
			items.push(ref);
			return evaluateItems();
		});
	}

	return evaluateItems();
}
