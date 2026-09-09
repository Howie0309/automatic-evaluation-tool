export function applicationOwnsCors(env = process.env) {
  return env.JUDGE_STORAGE_BACKEND !== 'cloudbase' && !env.TCB_ENV;
}
