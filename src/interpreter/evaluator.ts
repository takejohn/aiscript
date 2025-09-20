import { evaluateReferenceAsync, evaluateReferenceSync } from './evaluate-reference.js';
import type { Reference } from './reference.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Ast, Scope } from '../index.js';
import type { Control } from './control.js';
import type { CallInfo, NodeEvaluator, LogObject } from './types.js';
import type { Value, VFn } from './value.js';

export type Logger = {
	log(type: string, params: LogObject): void;
}

export type EvaluationStartStep<N extends Ast.Node> = (node: N, scope: Scope, logger: Logger) => EvaluationStepResult;

export type EvaluationContinueStep<T extends InstructionType> = (value: InstructionResult[T], logger: Logger) => EvaluationStepResult;

export type EvaluationStepResult = EvaluationDoneResult | EvaluationContinueResult;

export type EvaluationDoneResult = {
	done: true;
	value: Value | Control;
};

export type EvaluationContinueResult<T extends InstructionType = InstructionType> = {
	done: false;
	instruction: InstructionArgument & { type: T };
	then: EvaluationContinueStep<T>;
};

export type InstructionType = InstructionArgument['type'];

type InstructionArgument = EvalInstructionArgument | EvaluateReferenceArgument | FnArgument | RunArgument;

type EvalInstructionArgument = {
	type: 'eval';
	node: Ast.Node;
	scope: Scope;
};

type EvaluateReferenceArgument = {
	type: 'evaluateReference';
	node: Ast.Node;
	scope: Scope;
};

type FnArgument = {
	type: 'fn';
	fn: VFn;
	args: Value[];
	pos?: Ast.Pos;
};

type RunArgument = {
	type: 'run';
	program: Ast.Node[];
	scope: Scope;
};

type InstructionResult = {
	'eval': Value | Control;
	'evaluateReference': Reference | Control;
	'fn': Value;
	'run': Value | Control;
};

export const instructions = Object.freeze({
	end: (value: Value | Control): EvaluationDoneResult => ({ done: true, value }),
	eval: (node: Ast.Node, scope: Scope, then: EvaluationContinueStep<'eval'>): EvaluationContinueResult<'eval'> => ({
		done: false,
		instruction: { type: 'eval', node, scope },
		then,
	}),
	evaluateReference: (node: Ast.Node, scope: Scope, then: EvaluationContinueStep<'evaluateReference'>): EvaluationContinueResult<'evaluateReference'> => ({
		done: false,
		instruction: { type: 'evaluateReference', node, scope },
		then,
	}),
	fn: (fn: VFn, args: Value[], ...rest: [Ast.Pos, EvaluationContinueStep<'fn'>] | [EvaluationContinueStep<'fn'>]): EvaluationContinueResult<'fn'> => {
		let pos: Ast.Pos | undefined;
		let then: EvaluationContinueStep<'fn'>;
		if (rest.length === 2) {
			[pos, then] = rest;
		} else {
			[then] = rest; 
		}
		return {
			done: false,
			instruction: { type: 'fn', fn, args, pos },
			then,
		};
	},
	run: (program: Ast.Node[], scope: Scope, then: EvaluationContinueStep<'run'>): EvaluationContinueResult<'run'> => ({
		done: false,
		instruction: { type: 'run', program, scope },
		then,
	}),
});

export function evaluationStepsToEvaluator<N extends Ast.Node>(first: EvaluationStartStep<N>): NodeEvaluator<N> {
	return {
		async evalAsync(context: AsyncEvaluatorContext, node: N, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
			let result = first(node, scope, context);
			while (!result.done) {
				const input = await runInstructionAsync(result.instruction, context, callStack);
				result = result.then(input, context);
			}
			return result.value;
		},
		evalSync(context: SyncEvaluatorContext, node: N, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
			let result = first(node, scope, context);
			while (!result.done) {
				const input = runInstructionSync(result.instruction, context, callStack);
				result = result.then(input, context);
			}
			return result.value;
		},
	};
}

function runInstructionAsync(
	instruction: InstructionArgument,
	context: AsyncEvaluatorContext,
	callStack: readonly CallInfo[],
): Promise<InstructionResult[InstructionType]> {
	switch (instruction.type) {
		case 'eval': return context.eval(instruction.node, instruction.scope, callStack);
		case 'evaluateReference': return evaluateReferenceAsync(context, instruction.node, instruction.scope, callStack);
		case 'fn': return context.fn(instruction.fn, instruction.args, callStack, instruction.pos);
		case 'run': return context.run(instruction.program, instruction.scope, callStack);
	}
}

function runInstructionSync(
	instruction: InstructionArgument,
	context: SyncEvaluatorContext,
	callStack: readonly CallInfo[],
): InstructionResult[InstructionType] {
	switch (instruction.type) {
		case 'eval': return context.eval(instruction.node, instruction.scope, callStack);
		case 'evaluateReference': return evaluateReferenceSync(context, instruction.node, instruction.scope, callStack);
		case 'fn': return context.fn(instruction.fn, instruction.args, callStack, instruction.pos);
		case 'run': return context.run(instruction.program, instruction.scope, callStack);
	}
}
