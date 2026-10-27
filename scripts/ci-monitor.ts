import { execSync } from "child_process";

interface WorkflowRun {
  databaseId: number;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  url: string;
  createdAt: string;
  headSha: string;
  event: string;
  displayTitle: string;
}

function getLatestRun(): WorkflowRun | null {
  try {
    const raw = execSync(
      'gh run list --limit 1 --json databaseId,status,conclusion,url,createdAt,headSha,event,displayTitle',
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }
    );
    const runs: WorkflowRun[] = JSON.parse(raw);
    return runs.length > 0 ? runs[0] : null;
  } catch (err: any) {
    console.error("Không thể lấy dữ liệu GitHub Actions (kiểm tra `gh auth status`):", err.message);
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function monitorCI() {
  console.log("🔍 Đang kết nối và lắng nghe GitHub Actions CI/CD...");

  let run = getLatestRun();
  if (!run) {
    console.log("❌ Không tìm thấy lượt chạy CI/CD nào.");
    process.exit(1);
  }

  console.log(`📌 Lượt chạy: #${run.databaseId} - "${run.displayTitle}"`);
  console.log(`🔗 Chi tiết: ${run.url}`);

  // Chờ nếu workflow đang trong hàng đợi hoặc đang chạy
  while (run && run.status !== "completed") {
    process.stdout.write(`⏳ Trạng thái: [${run.status}] Đang chạy kiểm thử... \r`);
    await sleep(4000);
    run = getLatestRun();
  }

  console.log("\n--------------------------------------------------");
  if (!run) {
    console.log("❌ Mất kết nối tới GitHub Actions.");
    process.exit(1);
  }

  if (run.conclusion === "success") {
    console.log("✅ CI/CD THÀNH CÔNG! Tất cả các bước (Cài đặt, Vitest, Next.js Build) đều vượt qua.");
    process.exit(0);
  } else {
    console.error(`❌ CI/CD THẤT BẠI (Trạng thái: ${run.conclusion})!`);
    console.log("🔍 Đang trích xuất log lỗi...");
    try {
      const failedLog = execSync(`gh run view ${run.databaseId} --log-failed`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      console.log("\n--- CHI TIẾT LỖI TỪ GITHUB ACTIONS ---");
      console.log(failedLog.slice(-2000)); // Hiển thị 2000 ký tự log lỗi cuối cùng
      console.log("---------------------------------------");
    } catch {
      console.log("Không thể tải log chi tiết. Vui lòng xem tại link trên.");
    }
    process.exit(1);
  }
}

monitorCI().catch(console.error);
