/**
 * Sourced from https://github.com/chapeaux/cpx-store/blob/main/src/cpx-store.ts
 * (local copy: npm tarball currently omits the built entry file.)
 */
export class CPXStore extends HTMLElement {
  _state: Record<string, unknown>;
  _history: string[];
  _pointer: number;
  _isInternalChange: boolean;
  _isSyncing: boolean;
  _middleware: Array<(prop: string | symbol, value: unknown, oldValue?: unknown) => void>;
  declare state: Record<string, unknown>;

  constructor(
    initialState: Record<string, unknown> = {},
    middleware: Array<(prop: string | symbol, value: unknown, oldValue?: unknown) => void> = [],
  ) {
    super();
    this._state = initialState;
    this._history = [JSON.stringify(initialState)];
    this._pointer = 0;
    this._isInternalChange = false;
    this._isSyncing = false;
    this._middleware = middleware;
  }

  connectedCallback() {
    const storageKey = this.getAttribute('persist');

    this.state = new Proxy(this._state, {
      set: (target, prop, value) => {
        if (target[prop as string] === value) return true;

        this._middleware.forEach((fn) => fn(prop, value, target[prop as string]));

        if (!this._isInternalChange) {
          this._history = this._history.slice(0, this._pointer + 1);
          this._history.push(JSON.stringify({ ...target, [prop]: value }));
          this._pointer++;
        }

        target[prop as string] = value;

        if (storageKey && !this._isSyncing) {
          localStorage.setItem(storageKey, JSON.stringify(target));
        }

        this._broadcast(prop, value);
        return true;
      },
    });
  }

  _broadcast(prop: string | symbol, value: unknown, eventName = 'app-state-update') {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { prop, value },
        bubbles: true,
      }),
    );

    globalThis.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { store: this.tagName, prop, value },
      }),
    );
  }

  undo() {
    if (this._pointer > 0) {
      this._pointer--;
      this._applyHistory();
    }
  }

  redo() {
    if (this._pointer < this._history.length - 1) {
      this._pointer++;
      this._applyHistory();
    }
  }

  _applyHistory() {
    this._isInternalChange = true;
    const snapshot = JSON.parse(this._history[this._pointer]) as Record<string, unknown>;
    Object.assign(this.state, snapshot);
    this._isInternalChange = false;
  }
}
