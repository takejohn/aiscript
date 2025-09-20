import { type Value, type VFn } from '../value.js';
import type { Logger } from '../logger.js';
import type { Control } from '../control.js';
import type { Ast, Scope } from '../../index.js';
import type { CallInfo } from '../types.js';

interface EvaluatorContextBase {
	log: Logger
}

export interface AsyncEvaluatorContext extends EvaluatorContextBase {
	eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;

	fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Promise<Value>;

	run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control>;
}

export interface SyncEvaluatorContext extends EvaluatorContextBase {
	eval(node: Ast.Node, scope: Scope, callStack: readonly CallInfo[]): Value | Control;

	fn(fn: VFn, args: Value[], callStack: readonly CallInfo[], pos?: Ast.Pos): Value;

	run(program: Ast.Node[], scope: Scope, callStack: readonly CallInfo[]): Value | Control;
}
