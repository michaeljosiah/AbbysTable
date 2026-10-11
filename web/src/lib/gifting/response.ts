/** Reverse proxies and network failures need not return a JSON envelope. */
export async function giftResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  let answer: Record<string, unknown>;
  try {
    answer = await response.json();
  } catch {
    throw new Error('Your gift could not be saved. Please try again.');
  }
  if (!answer || typeof answer !== 'object')
    throw new Error('Your gift could not be saved. Please try again.');
  if (!response.ok)
    throw new Error(
      typeof answer.message === 'string'
        ? answer.message
        : 'Your gift could not be saved. Please try again.',
    );
  return answer;
}
