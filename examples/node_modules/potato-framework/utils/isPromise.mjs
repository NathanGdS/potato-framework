export function isPromise(func) {
    if (func.constructor.name === "AsyncFunction" || func instanceof Promise) {
      return true;
    }
  
    return false;
}