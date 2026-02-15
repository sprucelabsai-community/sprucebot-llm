import { assert } from '@sprucelabs/test-utils'

export class MockAbortController implements AbortController {
    public signal = new StubAbortSignal()
    public static instances: MockAbortController[] = []
    private wasAborted = false
    private abortReason?: any

    public constructor() {
        MockAbortController.instances.push(this)
    }

    public abort(reason?: any): void {
        this.abortReason = reason
        this.wasAborted = true
    }

    public assertWasAborted() {
        assert.isTrue(
            this.wasAborted,
            'Expected AbortController to have been aborted, but it was not.'
        )
    }

    public assertWasNotAborted() {
        assert.isFalse(
            this.wasAborted,
            'Expected AbortController to not have been aborted, but it was.'
        )
    }

    public assertWasAbortedWithReason(expected: string) {
        assert.isEqual(this.abortReason, expected, 'Wrong reason for abortion.')
    }
}

export class StubAbortSignal implements AbortSignal {
    public aborted = false
    public onabort: ((this: AbortSignal, ev: Event) => any) | null = null
    public reason: any = undefined

    public throwIfAborted(): void {}

    public addEventListener(
        _type: unknown,
        _listener: unknown,
        _options?: unknown
    ): void {}

    public removeEventListener(
        _type: unknown,
        _listener: unknown,
        _options?: unknown
    ): void {}

    public dispatchEvent(_event: Event): boolean {
        return true
    }
}
