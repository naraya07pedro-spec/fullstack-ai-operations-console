export function redactCredentials(text, values) {
  for (const value of values.filter((value) => typeof value === 'string' && value.length > 0))
    text = text.split(value).join('[REDACTED]');
  return text;
}
