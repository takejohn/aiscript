import { isControl } from '../../control.js';
import { Reference } from '../../reference.js';
import { assertObject } from '../../util.js';
import { instructions } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Control } from '../../control.js';
import type { Scope } from '../../scope.js';
import type { EvaluationStepResult } from '../step.js';

export function evalPropReference(node: Ast.Prop, scope: Scope): EvaluationStepResult<Reference | Control> {
	return instructions.eval<Reference | Control>(node.target, scope, (assignee) => {
		if (isControl(assignee)) {
			return instructions.end(assignee);
		}
		assertObject(assignee);

		return instructions.end(Reference.prop(assignee, node.name));
	});
}
