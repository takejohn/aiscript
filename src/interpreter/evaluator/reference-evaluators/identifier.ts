import { Reference } from '../../reference.js';
import { instructions } from '../step.js';
import type { Ast, Scope } from '../../../index.js';
import type { EvaluationStepResult } from '../step.js';

export function evalIdentifierReference(node: Ast.Identifier, scope: Scope): EvaluationStepResult<Reference> {
	return instructions.end(Reference.variable(node.name, scope));
}
