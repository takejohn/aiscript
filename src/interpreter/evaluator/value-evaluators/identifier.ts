import { instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

export function evalIdentifier(node: Ast.Identifier, scope: Scope): EvaluationStepResult {
	return instructions.end(scope.get(node.name));
}

