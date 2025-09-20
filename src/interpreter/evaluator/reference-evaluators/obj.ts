import { isControl } from '../../control.js';
import { Reference } from '../../reference.js';
import { instructions } from '../step.js';
import type { Ast, Scope } from '../../../index.js';
import type { Control } from '../../control.js';
import type { EvaluationStepResult } from '../step.js';

export function evalObjReference(node: Ast.Obj, scope: Scope): EvaluationStepResult<Reference | Control> {
	const entries = new Map<string, Reference>();
	const kvIterator = node.value.entries();

	function evaluateKvs(): EvaluationStepResult<Reference | Control> {
		const kvResult = kvIterator.next();
		if (kvResult.done) {
			return instructions.end(Reference.obj(entries));
		}

		const [key, item] = kvResult.value;
		return instructions.evaluateReference<Reference | Control>(item, scope, (ref) => {
			if (isControl(ref)) {
				return instructions.end(ref);
			}
			entries.set(key, ref);
			return evaluateKvs();
		});
	}

	return evaluateKvs();
}
