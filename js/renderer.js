// Singleton render function registry — avoids circular imports between app.js and event handlers.
let _render = null;

export function setRenderer(fn) {
  _render = fn;
}

export function render() {
  if (_render) _render();
}
