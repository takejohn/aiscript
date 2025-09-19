import { CONTINUE } from '../control.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationDoneResult, Logger } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Scope } from '../scope.js';

function evalContinue(node: Ast.Continue, scope: Scope, logger: Logger): EvaluationDoneResult {
	logger.log('block:continue', { scope: scope.name });
	return instructions.end(CONTINUE(node.label));
}

export const ContinueEvaluator = evaluationStepsToEvaluator(evalContinue);
