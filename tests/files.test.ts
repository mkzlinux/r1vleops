import { describe, expect, test } from "vitest";
import { MAX_FILE_BYTES, MAX_FILES, attachmentKey, validateFiles } from "@/lib/files";

const f = (name: string, size = 1000, type = "image/png") => ({ name, size, type });

describe("file validation", () => {
  test("accepts common design and document files", () => {
    expect(validateFiles([f("logo.png"), f("brief.pdf", 2000, "application/pdf"), f("mark.svg", 10, "image/svg+xml"), f("art.ai", 10, "")])).toEqual([]);
  });

  test("rejects executables and unknown types", () => {
    expect(validateFiles([f("run.exe", 10, "application/x-msdownload")])[0]).toMatch(/run\.exe/);
    expect(validateFiles([f("page.html", 10, "text/html")])[0]).toMatch(/not supported/);
  });

  test("rejects oversized files and too many files", () => {
    expect(validateFiles([f("big.png", MAX_FILE_BYTES + 1)])[0]).toMatch(/too large/);
    expect(validateFiles(Array.from({ length: MAX_FILES + 1 }, (_, i) => f(`a${i}.png`)))[0]).toMatch(/at most/);
  });

  test("builds storage keys that cannot escape the order folder", () => {
    expect(attachmentKey("ord_1", 0, "../../etc/passwd")).toBe("ord_1/0-etc-passwd");
    expect(attachmentKey("ord_1", 2, "My Logo (final).PNG")).toBe("ord_1/2-My-Logo-final-.PNG");
  });
});
