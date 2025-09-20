import { evaluateReferenceAsync, evaluateReferenceSync } from './reference-evaluator.js';
import type { Reference } from '../reference.js';
import type { AsyncEvaluatorContext, SyncEvaluatorContext } from './context.js';
import type { Ast, Scope } from '../../index.js';
import type { Control } from '../control.js';
import type { NodeEvaluator } from './types.js';
import type { CallInfo, LogObject } from '../types.js';
import type { Value, VFn } from '../value.js';

export type Logger = {
	log(type: string, params: LogObject): void;
}

export type EvaluationStartStep<N extends Ast.Node, R = Value | Control> = (node: N, scope: Scope, logger: Logger) => EvaluationStepResult<R>;

export type EvaluationContinueStep<T extends InstructionType, R = Value | Control> = (value: InstructionResult[T], logger: Logger) => EvaluationStepResult<R>;

export type EvaluationStepResult<R = Value | Control> = EvaluationDoneResult<R> | EvaluationContinueResult<InstructionType, R>;

export type EvaluationDoneResult<R = Value | Control> = {
	done: true;
	value: R;
};

export type EvaluationContinueResult<T extends InstructionType = InstructionType, R = Value | Control> = {
	done: false;
	instruction: InstructionArgument & { type: T };
	then: EvaluationContinueStep<T, R>;
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
	end: <R = Value | Control>(value: R): EvaluationDoneResult<R> => ({ done: true, value }),
	eval: <R = Value | Control>(node: Ast.Node, scope: Scope, then: EvaluationContinueStep<'eval', R>): EvaluationContinueResult<'eval', R> => ({
		done: false,
		instruction: { type: 'eval', node, scope },
		then,
	}),
	evaluateReference: <R = Value | Control>(node: Ast.Node, scope: Scope, then: EvaluationContinueStep<'evaluateReference', R>): EvaluationContinueResult<'evaluateReference', R> => ({
		done: false,
		instruction: { type: 'evaluateReference', node, scope },
		then,
	}),
	fn: <R = Value | Control>(fn: VFn, args: Value[], ...rest: [Ast.Pos, EvaluationContinueStep<'fn', R>] | [EvaluationContinueStep<'fn', R>]): EvaluationContinueResult<'fn', R> => {
		let pos: Ast.Pos | undefined;
		let then: EvaluationContinueStep<'fn', R>;
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
	run: <R>(program: Ast.Node[], scope: Scope, then: EvaluationContinueStep<'run', R>): EvaluationContinueResult<'run', R> => ({
		done: false,
		instruction: { type: 'run', program, scope },
		then,
	}),
});

export function evaluationStepsToEvaluator<N extends Ast.Node, R = Value | Control>(first: EvaluationStartStep<N, R>): NodeEvaluator<N, R> {
	return {
		async evalAsync(context: AsyncEvaluatorContext, node: N, scope: Scope, callStack: readonly CallInfo[]): Promise<R> {
			let result = first(node, scope, context);
			while (!result.done) {
				const input = await runInstructionAsync(result.instruction, context, callStack);
				result = result.then(input, context);
			}
			return result.value;
		},
		evalSync(context: SyncEvaluatorContext, node: N, scope: Scope, callStack: readonly CallInfo[]): R {
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
