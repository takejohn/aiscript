import * as assert from 'assert';
import { describe, test } from 'vitest';
import { utils } from '../src';
import { NUM, STR, NULL, ARR, OBJ, BOOL, TRUE, FALSE, ERROR ,FN_NATIVE } from '../src/interpreter/value';
import { AiScriptRuntimeError } from '../src/error';
import { exe, getMeta, eq } from './testutils';

describe('generics', () => {
    test.concurrent('function', async () => {
        await exe(`
            @f<T>(v: T): T { v }
        `);
    });
});
