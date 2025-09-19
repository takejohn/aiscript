import { FN, NULL } from '../value.js';
import { isControl } from '../control.js';
import { evaluationStepsToEvaluator, instructions } from '../evaluator.js';
import type { EvaluationStepResult } from '../evaluator.js';
import type { Ast } from '../../index.js';
import type { Value, VUserFn } from '../value.js';
import type { Scope } from '../scope.js';

function evalFn(node: Ast.Fn, scope: Scope): EvaluationStepResult {
	const params: VUserFn['params'] = [];
	const paramIterator = node.params.values();
	const evalParams = (): EvaluationStepResult => {
		const paramResult = paramIterator.next();
		if (paramResult.done) {
			return instructions.end(FN(
				params,
				node.children,
				scope,
			));
		}

		const setParam = (defaultValue: Value | undefined): EvaluationStepResult => {
			params.push({
				dest: param.dest,
				default: defaultValue,
			});
			return evalParams();
		};

		const param = paramResult.value;
		if (param.default != null) {
			return instructions.eval(param.default, scope, (defaultValue) => {
				if (isControl(defaultValue)) {
					return instructions.end(defaultValue);
				}
				return setParam(defaultValue);
			});
		}
		if (param.optional) {
			return setParam(NULL);
		}
		return setParam(undefined);
	};
	return evalParams();
}

export const FnEvaluator = evaluationStepsToEvaluator(evalFn);
