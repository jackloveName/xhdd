export function isMobileNumber (value) {
  return /^1\d{10}$/.test(String(value || '').trim())
}
