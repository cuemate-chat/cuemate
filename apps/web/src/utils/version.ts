/**
 * 版本比较工具函数
 * 支持格式: v0.1.0, v1.0.0, v1.1.1 等
 */

/**
 * 解析版本号字符串为数字数组
 * @param version 版本号字符串,如 "v0.1.0"
 * @returns 数字数组,如 [0, 1, 0]
 */
function parseVersion(version: string): number[] {
  // 移除开头的 v
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  return cleanVersion.split('.').map((num) => parseInt(num, 10) || 0);
}

/**
 * 比较两个版本号
 * @param version1 第一个版本号
 * @param version2 第二个版本号
 * @returns 1: version1 > version2, -1: version1 < version2, 0: version1 === version2
 */
export function compareVersion(version1: string, version2: string): number {
  const v1Parts = parseVersion(version1);
  const v2Parts = parseVersion(version2);

  // 补齐长度
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);

  // 逐位比较
  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }

  return 0;
}

/**
 * 判断 version1 是否大于 version2
 */
export function isVersionGreater(version1: string, version2: string): boolean {
  return compareVersion(version1, version2) > 0;
}

/**
 * 判断 version1 是否小于 version2
 */
export function isVersionLess(version1: string, version2: string): boolean {
  return compareVersion(version1, version2) < 0;
}

/**
 * 判断 version1 是否等于 version2
 */
export function isVersionEqual(version1: string, version2: string): boolean {
  return compareVersion(version1, version2) === 0;
}

/**
 * 判断 version1 是否小于等于 version2
 */
export function isVersionLessOrEqual(version1: string, version2: string): boolean {
  return compareVersion(version1, version2) <= 0;
}

/**
 * 判断 version1 是否大于等于 version2
 */
export function isVersionGreaterOrEqual(version1: string, version2: string): boolean {
  return compareVersion(version1, version2) >= 0;
}
