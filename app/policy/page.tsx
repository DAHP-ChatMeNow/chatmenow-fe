import Link from "next/link";

const updatedAt = "07/04/2026";

export default function PolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-blue-600">Chat Me Now</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Điều khoản và Chính sách
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Cập nhật lần cuối: {updatedAt}
          </p>
          <p className="mt-4 text-slate-700">
            Trang này mô tả các điều khoản sử dụng dịch vụ và chính sách bảo mật
            dữ liệu cho người dùng Chat Me Now.
          </p>
        </div>

        <section
          id="terms"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-2xl font-semibold text-slate-900">
            Điều khoản sử dụng
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Bạn cam kết cung cấp thông tin đăng ký chính xác và cập nhật khi
              có thay đổi.
            </li>
            <li>
              Không sử dụng nền tảng để phát tán nội dung vi phạm pháp luật hoặc
              xâm phạm quyền của người khác.
            </li>
            <li>
              Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu của mình.
            </li>
            <li>
              Chat Me Now có thể tạm ngưng hoặc khóa tài khoản nếu phát hiện
              hành vi lạm dụng hoặc vi phạm điều khoản.
            </li>
          </ul>
        </section>

        <section
          id="privacy"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-2xl font-semibold text-slate-900">
            Chính sách bảo mật
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Chúng tôi thu thập dữ liệu cần thiết để tạo tài khoản, xác thực và
              cung cấp tính năng nhắn tin.
            </li>
            <li>
              Dữ liệu cá nhân được sử dụng cho mục đích vận hành dịch vụ, cải
              thiện trải nghiệm và hỗ trợ người dùng.
            </li>
            <li>
              Thông tin của bạn không được bán cho bên thứ ba; chỉ chia sẻ khi
              có yêu cầu pháp lý hoặc phục vụ vận hành hợp pháp.
            </li>
            <li>
              Bạn có thể yêu cầu chỉnh sửa hoặc xóa dữ liệu theo quy trình hỗ
              trợ của hệ thống.
            </li>
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Quay lại đăng ký
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
