import { AiScriptRuntimeError } from '../../error.js';
import { evalIdentifierReference } from './reference-evaluators/identifier.js';
import { evalIndexReference } from './reference-evaluators/index.js';
import { evalPropReference } from './reference-evaluators/prop.js';
import { evalArrReference } from './reference-evaluators/arr.js';
import { evalObjReference } from './reference-evaluators/obj.js';
import type { EvaluationStepResult } from './step.js';
import type { Control } from '../control.js';
import type { Reference } from '../reference.js';
import type { Ast, Scope } from '../../index.js';

export function evalReference(node: Ast.Node, scope: Scope): EvaluationStepResult<Reference | Control> {
	switch (node.type) {
		case 'identifier': return evalIdentifierReference(node, scope);
		case 'index': return evalIndexReference(node, scope);
		case 'prop': return evalPropReference(node, scope);
		case 'arr': return evalArrReference(node, scope);
		case 'obj': return evalObjReference(node, scope);
		default: throw new AiScriptRuntimeError('The left-hand side of an assignment expression must be a variable or a property/index access.');
	}
}
