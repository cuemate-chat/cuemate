import { useState } from 'react';
import { batchImportPresetQuestions } from '../api/preset-questions';
import { message as globalMessage } from '../components/Message';

interface ImportResult {
  importedCount: number;
  skippedCount: number;
  errors?: string[];
}

interface UseQuestionImportOptions {
  overwrite?: boolean;
  is_builtin?: boolean; // 是否为内置题库（从 License 页面导入为 true）
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
}

export function useQuestionImport(options?: UseQuestionImportOptions) {
  const [importing, setImporting] = useState(false);

  /**
   * 解析 CSV 或 JSON 文件内容
   */
  const parseFileContent = (
    fileContent: string,
    fileName: string
  ): Array<{ question: string; answer: string; tag_name?: string | null }> => {
    let questions: Array<{ question: string; answer: string; tag_name?: string | null }> = [];

    if (fileName.endsWith('.json')) {
      // JSON 格式解析
      const data = JSON.parse(fileContent);
      if (Array.isArray(data)) {
        questions = data
          .map((item: any) => ({
            question: String(item.question || '').trim(),
            answer: String(item.answer || '').trim(),
            tag_name: item.tag_name || null,
          }))
          .filter((item) => item.question && item.answer);
      }
    } else if (fileName.endsWith('.csv')) {
      // CSV 格式解析
      const lines = fileContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);

      // 跳过表头
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map((col) => col.trim().replace(/^"|"$/g, ''));
        if (columns.length >= 2 && columns[0] && columns[1]) {
          questions.push({
            question: columns[0],
            answer: columns[1],
            tag_name: columns[2] || null,
          });
        }
      }
    }

    return questions;
  };

  /**
   * 导入题库文件
   */
  const importFile = async (file: File): Promise<ImportResult | null> => {
    // 检查文件类型
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      globalMessage.error('只支持上传 .csv 或 .json 文件');
      return null;
    }

    setImporting(true);

    try {
      // 读取文件内容
      const fileContent = await file.text();

      // 解析文件
      const questions = parseFileContent(fileContent, file.name);

      if (questions.length === 0) {
        globalMessage.warning('未找到有效的题目数据，请检查文件格式');
        return null;
      }

      // 调用批量导入 API
      const result = await batchImportPresetQuestions({
        questions,
        overwrite: options?.overwrite ?? false,
        is_builtin: options?.is_builtin ?? false,
      });

      // 显示成功消息
      globalMessage.success(
        `批量导入完成！新增 ${result.importedCount} 个，跳过 ${result.skippedCount} 个${result.errors?.length ? `，错误 ${result.errors.length} 个` : ''}`
      );

      // 错误信息输出到控制台
      if (result.errors && result.errors.length > 0) {
        console.error('导入错误：', result.errors);
      }

      // 调用成功回调
      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error: any) {
      console.error('题库导入失败:', error);
      globalMessage.error(error?.message || '导入失败');

      // 调用错误回调
      if (options?.onError) {
        options.onError(error);
      }

      return null;
    } finally {
      setImporting(false);
    }
  };

  return {
    importing,
    importFile,
  };
}
