const useCloudBase = process.env.JUDGE_STORAGE_BACKEND === 'cloudbase';

let implementationPromise;

function implementation() {
  implementationPromise ||= useCloudBase
    ? import('./cloud-storage.js')
    : import('./storage.js');
  return implementationPromise;
}

export async function saveUpload(payload) {
  return (await implementation()).saveUpload(payload);
}

export async function saveRun(payload) {
  return (await implementation()).saveRun(payload);
}

export async function listRuns() {
  return (await implementation()).listRuns();
}

export async function readRunArtifact(id, format) {
  return (await implementation()).readRunArtifact(id, format);
}

export async function readUploadArtifact(id) {
  return (await implementation()).readUploadArtifact(id);
}

export async function readUploadImages(id) {
  return (await implementation()).readUploadImages(id);
}

export async function readUploadImage(id, imageId) {
  return (await implementation()).readUploadImage(id, imageId);
}

export async function deleteRun(id) {
  return (await implementation()).deleteRun(id);
}
