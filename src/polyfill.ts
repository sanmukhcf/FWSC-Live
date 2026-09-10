/**
 * Global environment polyfill and safeguard:
 * In sandboxed iframes, certain browser versions, or host container environments,
 * window.fetch may be exposed as an accessor property with only a getter (no setter)
 * on Window or Window.prototype.
 * 
 * When external monitoring tools, analytics, AI Studio iframe handlers, or browser extensions
 * attempt to wrap window.fetch (e.g. `window.fetch = patchedFetch`), the JavaScript engine
 * throws:
 * "Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter"
 * 
 * This polyfill ensures window.fetch has both a getter and a setter so any assignment
 * succeeds seamlessly without throwing errors.
 */
(function setupFetchSafeguard() {
  if (typeof window === 'undefined') return;

  try {
    var originalFetch = window.fetch;
    if (typeof originalFetch !== 'function') return;

    // Check existing descriptor on window or prototype chain
    var winDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
    var protoDesc = typeof Window !== 'undefined' && Window.prototype
      ? Object.getOwnPropertyDescriptor(Window.prototype, 'fetch')
      : undefined;

    var needsPatch = false;
    if (winDesc && (!winDesc.set && !winDesc.writable)) {
      needsPatch = true;
    } else if (!winDesc && protoDesc && (!protoDesc.set && !protoDesc.writable)) {
      needsPatch = true;
    } else if (!winDesc && !protoDesc) {
      needsPatch = true;
    }

    // Always define a robust getter/setter on window
    var currentFetch = function () {
      return originalFetch.apply(window, arguments as any);
    };

    try {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get: function () {
          return currentFetch;
        },
        set: function (newFetch) {
          currentFetch = newFetch;
        },
      });
    } catch {
      // If setting on window directly fails, try Window.prototype
      if (typeof Window !== 'undefined' && Window.prototype) {
        Object.defineProperty(Window.prototype, 'fetch', {
          configurable: true,
          enumerable: true,
          get: function () {
            return currentFetch;
          },
          set: function (newFetch) {
            currentFetch = newFetch;
          },
        });
      }
    }
  } catch (err) {
    // Fail silently so startup is never blocked
    console.debug('Fetch setter safeguard initialization:', err);
  }
})();
