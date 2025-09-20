import { unWrapLabeledBreak } from '../../control.js';
import { instructions } from '../step.js';
import type { EvaluationStepResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

export function evalBlock(node: Ast.Block, scope: Scope): EvaluationStepResult {
	return instructions.run(node.statements, scope.createChildScope(), (value) => {
		return instructions.end(unWrapLabeledBreak(value, node.label));
	});
}

