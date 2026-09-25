// filepath: frontend/src/utils/terminalHelper.ts
import { Terminal } from '@xterm/xterm';

/**
 * Loại bỏ toàn bộ mã điều khiển màu ANSI và ký tự escape đặc biệt của terminal
 */
export function cleanAnsiCodes(text: string): string {
  // Regex làm sạch ANSI escape sequences (màu sắc, di chuyển con trỏ, reset)
  const ansiRegex = /[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g;
  return text.replace(ansiRegex, '');
}

/**
 * Nén các dòng lặp liên tiếp (ví dụ: vòng lặp log lỗi hoặc ping liên tục)
 */
export function compressConsecutiveDuplicates(lines: string[]): string[] {
  const result: string[] = [];
  let prevLine = '';
  let repeatCount = 0;

  for (const line of lines) {
    if (line === prevLine && line.trim().length > 0) {
      repeatCount++;
    } else {
      if (repeatCount > 1) {
        result.push(`  ↳ [Dòng trên lặp lại ${repeatCount} lần]`);
      }
      result.push(line);
      prevLine = line;
      repeatCount = 1;
    }
  }

  if (repeatCount > 1) {
    result.push(`  ↳ [Dòng trên lặp lại ${repeatCount} lần]`);
  }

  return result;
}

/**
 * Thuật toán Cắt Xén Thông Minh (Head-Tail Sampling Truncation):
 * Khi log quá dài, giữ lại phần đầu (lệnh đã gõ) và phần đuôi (vết lỗi/exit code),
 * lược bỏ phần thân log ở giữa để không bị tràn Token Limit của AI.
 *
 * @param lines - Mảng các dòng log
 * @param maxTotalLines - Giới hạn tổng số dòng (mặc định 70 dòng)
 * @param maxChars - Giới hạn ký tự an toàn (mặc định 8000 ký tự ~ 2000 tokens)
 */
export function truncateLogSmart(
  lines: string[],
  maxTotalLines: number = 70,
  maxChars: number = 8000
): string {
  if (lines.length === 0) return '';

  let processedLines = compressConsecutiveDuplicates(lines);

  // Nếu số dòng vượt quá ngưỡng
  if (processedLines.length > maxTotalLines) {
    const headLinesCount = 15; // Giữ 15 dòng đầu (xem lệnh người dùng gõ là gì)
    const tailLinesCount = maxTotalLines - headLinesCount; // Giữ 55 dòng cuối (chứa thông tin lỗi, crash)
    const skippedCount = processedLines.length - (headLinesCount + tailLinesCount);

    const head = processedLines.slice(0, headLinesCount);
    const tail = processedLines.slice(-tailLinesCount);

    processedLines = [
      ...head,
      `\n--- [✂️ Đã lược bỏ ${skippedCount} dòng log ở giữa để tiết kiệm Token cho AI] ---\n`,
      ...tail
    ];
  }

  let finalString = processedLines.join('\n');

  // Hard Cap giới hạn ký tự phòng trường hợp có dòng log siêu dài (base64 hoặc minified text)
  if (finalString.length > maxChars) {
    const headChars = Math.floor(maxChars * 0.3);
    const tailChars = Math.floor(maxChars * 0.7);
    finalString = `${finalString.slice(0, headChars)}\n\n[...Đã cắt xén bớt ký tự thừa...]\n\n${finalString.slice(-tailChars)}`;
  }

  return finalString;
}

/**
 * Trích xuất an toàn từ bộ đệm active của xterm.js với Token Limit Optimization
 */
export function extractTerminalBuffer(
  term: Terminal | null,
  maxLines: number = 100
): string {
  if (!term || !term.buffer || !term.buffer.active) {
    return '';
  }

  const buffer = term.buffer.active;
  const totalBufferLines = buffer.length;
  // Lấy tối đa maxLines từ cuối buffer
  const startLine = Math.max(0, totalBufferLines - maxLines);
  const rawLines: string[] = [];

  for (let i = startLine; i < totalBufferLines; i++) {
    const line = buffer.getLine(i);
    if (line) {
      const lineStr = line.translateToString(true);
      // Bỏ các dòng rỗng liên tiếp ở cuối
      rawLines.push(cleanAnsiCodes(lineStr));
    }
  }

  // Lọc bớt các dòng trống vô nghĩa
  const cleanedLines = rawLines.filter((l, idx) => {
    if (l.trim().length === 0 && idx === rawLines.length - 1) return false;
    return true;
  });

  return truncateLogSmart(cleanedLines, 70, 8000);
}

