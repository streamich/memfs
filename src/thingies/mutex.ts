import {codeMutex} from './codeMutex';

/**
 * Executes only one instance of give code at a time. For parallel calls, it
 * returns the result of the ongoing execution.
 *
 * {@link mutex} can be used as a class method decorator or a higher order
 * function.
 */
export function mutex<This, Return>(
  target: (this: This) => Promise<Return>,
  context?: ClassMethodDecoratorContext<This, (this: This) => Promise<Return>>,
) {
  const mut = codeMutex<Return>();
  return async function (this: This): Promise<Return> {
    return await mut(async () => await target.call(this));
  };
}
