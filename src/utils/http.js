import { execFileSync } from 'node:child_process';

function curlRequest(url, headers = {}) {
  const args = ['-L', '--silent', '--show-error'];
  for (const [key, value] of Object.entries(headers)) {
    args.push('-H', `${key}: ${value}`);
  }
  args.push(url);
  return execFileSync('curl', args, { encoding: 'utf8' });
}

export async function getText(url, headers = {}) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch {
    return curlRequest(url, headers);
  }
}

export async function getJson(url, headers = {}) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return JSON.parse(curlRequest(url, headers));
  }
}
