import { CONTINUE } from '../../control.js';
import { instructions } from '../step.js';
import type { Logger } from '../../logger.js';
import type { EvaluationDoneResult } from '../step.js';
import type { Ast } from '../../../index.js';
import type { Scope } from '../../scope.js';

export function evalContinue(node: Ast.Continue, scope: Scope, logger: Logger): EvaluationDoneResult {
	logger('block:continue', { scope: scope.name });
	return instructions.end(CONTINUE(node.label));
}
