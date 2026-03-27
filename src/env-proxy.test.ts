import { describe, expect, it } from 'vitest';
import {
  hasEnvProxyEnabled,
  hasProxyEnv,
  shouldRelaunchWithEnvProxy,
  supportsNodeEnvProxyFlag,
} from './env-proxy.js';

describe('env proxy bootstrap', () => {
  it('detects standard proxy environment variables', () => {
    expect(hasProxyEnv({ HTTPS_PROXY: 'http://127.0.0.1:7890' })).toBe(true);
    expect(hasProxyEnv({ ALL_PROXY: 'socks5://127.0.0.1:7890' })).toBe(true);
    expect(hasProxyEnv({ HTTPS_PROXY: '   ' })).toBe(false);
    expect(hasProxyEnv({})).toBe(false);
  });

  it('detects whether node env proxy support is available', () => {
    expect(supportsNodeEnvProxyFlag(new Set(['--use-env-proxy']))).toBe(true);
    expect(supportsNodeEnvProxyFlag(new Set(['use-env-proxy']))).toBe(true);
    expect(supportsNodeEnvProxyFlag(new Set(['--inspect']))).toBe(false);
  });

  it('detects already-enabled env proxy mode', () => {
    expect(hasEnvProxyEnabled(['--use-env-proxy'], {})).toBe(true);
    expect(hasEnvProxyEnabled([], { NODE_USE_ENV_PROXY: '1' })).toBe(true);
    expect(hasEnvProxyEnabled([], {})).toBe(false);
  });

  it('relaunches only when proxy env is present and env-proxy mode is still off', () => {
    const env = { HTTPS_PROXY: 'http://127.0.0.1:7890' };
    expect(shouldRelaunchWithEnvProxy([], env, new Set(['--use-env-proxy']))).toBe(true);
    expect(shouldRelaunchWithEnvProxy(['--use-env-proxy'], env, new Set(['--use-env-proxy']))).toBe(false);
    expect(shouldRelaunchWithEnvProxy([], { ...env, NODE_USE_ENV_PROXY: '1' }, new Set(['--use-env-proxy']))).toBe(false);
    expect(shouldRelaunchWithEnvProxy([], { ...env, OPENCLI_USE_ENV_PROXY_REEXEC: '1' }, new Set(['--use-env-proxy']))).toBe(false);
    expect(shouldRelaunchWithEnvProxy([], { ...env, OPENCLI_DISABLE_ENV_PROXY_AUTO: '1' }, new Set(['--use-env-proxy']))).toBe(false);
    expect(shouldRelaunchWithEnvProxy([], env, new Set(['--inspect']))).toBe(false);
  });
});
