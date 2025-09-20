import { BOOL } from '../../value.js';
import { instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

export function evalExists(node: Ast.Exists, scope: Scope): EvaluationStepResult {
	return instructions.end(BOOL(scope.exists(node.identifier.name)));
}

