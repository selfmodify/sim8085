export function getAutoStopHltDefault() {
  return localStorage.getItem('sim8085_autostop_hlt') !== 'false';
}
