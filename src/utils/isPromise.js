export function isPromise(func) {
    if (func.constructor.name === "AsyncFunction") {
      return true;
    }
  
    return false;
}