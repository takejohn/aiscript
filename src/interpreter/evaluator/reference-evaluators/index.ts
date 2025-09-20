import { AiScriptRuntimeError } from '../../../error.js';
import { isControl } from '../../control.js';
import { Reference } from '../../reference.js';
import { assertNumber, assertString, isArray, isObject, reprValue } from '../../util.js';
import { instructions } from '../step.js';
import type { Ast, Scope } from '../../../index.js';
import type { Control } from '../../control.js';
import type { Value } from '../../value.js';
import type { EvaluationStepResult } from '../step.js';

export function evalIndexReference(node: Ast.Index, scope: Scope): EvaluationStepResult<Reference | Control> {
	return instructions.eval(node.target, scope, (assignee) => {
		if (isControl(assignee)) {
			return instructions.end(assignee);
		}

		return instructions.eval<Reference | Control>(node.index, scope, (i) => {
			if (isControl(i)) {
				return instructions.end(i);
			}
			return instructions.end(getIndexReference(assignee, i));
		});
	});
}

function getIndexReference(assignee: Value, i: Value): Reference {
	if (isArray(assignee)) {
		assertNumber(i);
		return Reference.index(assignee, i.value);
	} else if (isObject(assignee)) {
		assertString(i);
		return Reference.prop(assignee, i.value);
	} else {
		throw new AiScriptRuntimeError(`Cannot read prop (${reprValue(i)}) of ${assignee.type}.`);
	}
}
