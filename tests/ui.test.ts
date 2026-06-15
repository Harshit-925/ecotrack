import test from 'node:test';
import assert from 'node:assert';

// Define a minimal Mock HTML Element class
class MockElement {
  id: string;
  className = '';
  _textContent = '';
  _innerText = '0';
  value = '30';
  style: Record<string, string> = {};
  attributes: Record<string, string> = {};
  children: MockElement[] = [];

  constructor(id: string) {
    this.id = id;
  }

  get textContent() {
    return this._textContent;
  }
  set textContent(val: string) {
    this._textContent = val;
    this.children = [];
  }

  get innerText() {
    return this._innerText;
  }
  set innerText(val: string) {
    this._innerText = val;
    this.children = [];
  }

  addEventListener(event: string, callback: Function) {
    // Mock listener binding
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  appendChild(child: any) {
    if (child && child.id !== 'text-node') {
      this.children.push(child);
    }
  }

  remove() {
    // Mock deletion
  }

  querySelectorAll(selector: string) {
    return [];
  }

  getBoundingClientRect() {
    return { width: 300, height: 300, left: 0, top: 0 };
  }

  getContext(dim: string) {
    return {
      scale: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      rect: () => {},
      fill: () => {},
      fillText: () => {},
      closePath: () => {},
      translate: () => {}
    };
  }

  classList = {
    classes: new Set<string>(),
    add: (c: string) => this.classList.classes.add(c),
    remove: (c: string) => this.classList.classes.delete(c),
    toggle: (c: string) => {
      if (this.classList.classes.has(c)) {
        this.classList.classes.delete(c);
        return false;
      }
      this.classList.classes.add(c);
      return true;
    },
    contains: (c: string) => this.classList.classes.has(c)
  };
}

// Mock environment globals
const mockElements: Record<string, MockElement> = {};
const documentListeners: Record<string, Function[]> = [];

const mockDocument = {
  addEventListener: (event: string, callback: Function) => {
    if (!documentListeners[event]) documentListeners[event] = [];
    documentListeners[event].push(callback);
  },
  getElementById: (id: string) => {
    if (!mockElements[id]) {
      mockElements[id] = new MockElement(id);
    }
    return mockElements[id];
  },
  createElement: (tag: string) => {
    return new MockElement(tag);
  },
  createElementNS: (ns: string, tag: string) => {
    return new MockElement(tag);
  },
  createTextNode: (text: string) => {
    return new MockElement('text-node');
  },
  querySelectorAll: (selector: string) => {
    const list: MockElement[] = [];
    if (selector === '.progress-step') {
      return [
        new MockElement('step-1'),
        new MockElement('step-2'),
        new MockElement('step-3'),
        new MockElement('step-4')
      ];
    }
    if (selector === '.select-option' || selector === '.diet-option') {
      return [new MockElement('opt-1')];
    }
    return list;
  },
  body: new MockElement('body')
};

// Bind to Node's global object safely via direct assignment
const g = globalThis as any;
g.document = mockDocument;
g.window = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: () => {},
  matchMedia: () => ({ matches: false }),
  devicePixelRatio: 1
};
g.performance = {
  now: () => Date.now()
};
if (typeof g.navigator === 'undefined') {
  g.navigator = {
    clipboard: {
      writeText: async () => {}
    }
  };
} else {
  Object.defineProperty(g.navigator, 'clipboard', {
    value: {
      writeText: async () => {}
    },
    configurable: true,
    writable: true
  });
}
g.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
g.setInterval = () => 1;
g.requestAnimationFrame = (cb: Function) => setTimeout(() => cb(Date.now()), 16);

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
g.IntersectionObserver = MockIntersectionObserver;

test('EcoTrack DOM UI Integration tests', async (t) => {
  
  await t.test('Application initializes DOM events and calculates default emissions without crashing', async () => {
    // Dynamically import compiled app.js to trigger DOMContentLoaded hooks
    await import('../app.js');

    // Trigger DOMContentLoaded
    const callbacks = documentListeners['DOMContentLoaded'] || [];
    for (const cb of callbacks) {
      cb();
    }

    // Verify app.ts correctly populated the sticky footer running total value
    const runningTotalEl = mockDocument.getElementById('running-total-value');
    
    // Check that elements were queried and updated
    assert.ok(runningTotalEl);
    assert.strictEqual(runningTotalEl.children.length, 1); // contains the small element
  });
});
