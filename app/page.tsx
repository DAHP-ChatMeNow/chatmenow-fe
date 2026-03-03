"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Users,
  Shield,
  Zap,
  Video,
  Image as ImageIcon,
  Globe,
  Clock,
  CheckCircle2,
  Smartphone,
  Star,
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/messages");
    }
  }, [user, router]);

  // Nếu đã đăng nhập, không render gì (đang redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-md border-slate-200">
        <div className="container px-6 py-4 mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-blue-600">
                Chat Me Now
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <button className="px-6 py-2 font-medium transition-colors text-slate-700 hover:text-blue-600">
                  Đăng nhập
                </button>
              </Link>
              <Link href="/signup">
                <button className="px-6 py-2 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700">
                  Đăng ký ngay
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-12 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container max-w-5xl mx-auto">
          <div className="space-y-6 text-center">
            <div className="inline-block">
              <div className="p-4 bg-blue-600 shadow-2xl rounded-2xl shadow-blue-500/50 animate-pulse">
                <MessageCircle className="w-16 h-16 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl text-slate-900">
              Kết nối mọi lúc,
              <br />
              <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                mọi nơi
              </span>
            </h1>

            <p className="max-w-xl mx-auto text-base leading-relaxed md:text-lg text-slate-600">
              <span className="font-semibold text-blue-600">Chat Me Now</span> -
              Ứng dụng nhắn tin hiện đại, giúp bạn kết nối với bạn bè, gia đình
              một cách nhanh chóng và an toàn
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-10 bg-white border-y border-slate-200">
        <div className="container max-w-6xl mx-auto">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-blue-600">10M+</div>
              <div className="text-slate-600">Người dùng</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-purple-600">50M+</div>
              <div className="text-slate-600">Tin nhắn/ngày</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-600">100+</div>
              <div className="text-slate-600">Quốc gia</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-orange-600">99.9%</div>
              <div className="text-slate-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="px-6 py-12 bg-gradient-to-br from-slate-50 to-white">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              Tại sao chọn Chat Me Now?
            </h2>
            <p className="max-w-2xl mx-auto text-base text-slate-600">
              Chúng tôi mang đến trải nghiệm nhắn tin tốt nhất với những lợi ích
              vượt trội
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex gap-4 p-6 transition-shadow bg-white shadow-sm rounded-2xl hover:shadow-md">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Miễn phí 100%
                </h3>
                <p className="text-slate-600">
                  Không mất phí, không quảng cáo gây phiền nhiễu. Trải nghiệm
                  hoàn toàn miễn phí.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 transition-shadow bg-white shadow-sm rounded-2xl hover:shadow-md">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Bảo mật tuyệt đối
                </h3>
                <p className="text-slate-600">
                  Mã hóa end-to-end, dữ liệu của bạn được bảo vệ tối đa, không
                  ai có thể đọc được.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 transition-shadow bg-white shadow-sm rounded-2xl hover:shadow-md">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                  <Globe className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Đa nền tảng
                </h3>
                <p className="text-slate-600">
                  Sử dụng trên web, mobile, desktop. Đồng bộ dữ liệu mượt mà
                  trên mọi thiết bị.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 transition-shadow bg-white shadow-sm rounded-2xl hover:shadow-md">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Hỗ trợ 24/7
                </h3>
                <p className="text-slate-600">
                  Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn mọi lúc, mọi nơi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-12 bg-white">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              Tính năng nổi bật
            </h2>
            <p className="text-base text-slate-600">
              Trải nghiệm nhắn tin hoàn hảo với những tính năng hiện đại
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-8 transition-shadow border border-blue-100 bg-gradient-to-br from-blue-50 to-white rounded-2xl hover:shadow-lg">
              <div className="flex items-center justify-center mb-6 bg-blue-600 w-14 h-14 rounded-xl">
                <Zap className="text-white w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">
                Tin nhắn tức thì
              </h3>
              <p className="text-slate-600">
                Gửi và nhận tin nhắn trong chớp mắt, không độ trễ
              </p>
            </div>

            <div className="p-8 transition-shadow border border-purple-100 bg-gradient-to-br from-purple-50 to-white rounded-2xl hover:shadow-lg">
              <div className="flex items-center justify-center mb-6 bg-purple-600 w-14 h-14 rounded-xl">
                <Users className="text-white w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">
                Nhóm chat
              </h3>
              <p className="text-slate-600">
                Tạo nhóm chat không giới hạn thành viên
              </p>
            </div>

            <div className="p-8 transition-shadow border border-green-100 bg-gradient-to-br from-green-50 to-white rounded-2xl hover:shadow-lg">
              <div className="flex items-center justify-center mb-6 bg-green-600 w-14 h-14 rounded-xl">
                <Video className="text-white w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">
                Video Call HD
              </h3>
              <p className="text-slate-600">
                Gọi video chất lượng cao, gặp mặt trực tuyến
              </p>
            </div>

            <div className="p-8 transition-shadow border border-orange-100 bg-gradient-to-br from-orange-50 to-white rounded-2xl hover:shadow-lg">
              <div className="flex items-center justify-center mb-6 bg-orange-600 w-14 h-14 rounded-xl">
                <ImageIcon className="text-white w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">
                Chia sẻ media
              </h3>
              <p className="text-slate-600">
                Gửi hình ảnh, video, file dễ dàng
              </p>
            </div>

            <div className="p-8 transition-shadow border border-pink-100 bg-gradient-to-br from-pink-50 to-white rounded-2xl hover:shadow-lg">
              <div className="flex items-center justify-center mb-6 bg-pink-600 w-14 h-14 rounded-xl">
                <Smartphone className="text-white w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">
                Giao diện đẹp
              </h3>
              <p className="text-slate-600">
                Thiết kế hiện đại, thân thiện với mọi lứa tuổi
              </p>
            </div>

            <div className="p-8 transition-shadow border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white rounded-2xl hover:shadow-lg">
              <div className="flex items-center justify-center mb-6 bg-indigo-600 w-14 h-14 rounded-xl">
                <Star className="text-white w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">
                Sticker & Emoji
              </h3>
              <p className="text-slate-600">
                Hàng nghìn sticker, emoji thể hiện cảm xúc
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="px-6 py-12 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              Bắt đầu chỉ với 3 bước
            </h2>
            <p className="text-base text-slate-600">Đơn giản và nhanh chóng</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-4 text-center">
              <div className="inline-block p-6 bg-white rounded-full shadow-lg">
                <div className="text-4xl font-bold text-blue-600">1</div>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Đăng ký tài khoản
              </h3>
              <p className="text-slate-600">
                Tạo tài khoản miễn phí chỉ trong 30 giây
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="inline-block p-6 bg-white rounded-full shadow-lg">
                <div className="text-4xl font-bold text-purple-600">2</div>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Kết nối bạn bè
              </h3>
              <p className="text-slate-600">Tìm kiếm và thêm bạn bè dễ dàng</p>
            </div>

            <div className="space-y-4 text-center">
              <div className="inline-block p-6 bg-white rounded-full shadow-lg">
                <div className="text-4xl font-bold text-green-600">3</div>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Bắt đầu chat</h3>
              <p className="text-slate-600">Nhắn tin, gọi điện ngay lập tức</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-12 bg-white">
        <div className="container max-w-4xl mx-auto">
          <div className="p-8 text-center shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl md:p-12">
            <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
              Sẵn sàng kết nối?
            </h2>
            <p className="max-w-2xl mx-auto mb-6 text-base text-blue-100 md:text-lg">
              Tham gia cùng hàng triệu người dùng đang trò chuyện trên Chat Me
              Now mỗi ngày
            </p>
            <Link href="/signup">
              <button className="px-10 text-lg font-semibold text-blue-600 transition-all bg-white shadow-lg h-14 hover:bg-blue-50 rounded-xl hover:shadow-xl">
                Đăng ký miễn phí ngay
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-slate-900">
        <div className="container max-w-6xl mx-auto">
          <div className="grid gap-8 mb-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">
                  Chat Me Now
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Ứng dụng nhắn tin hiện đại, kết nối mọi người
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Sản phẩm</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Tính năng
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Bảo mật
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Doanh nghiệp
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Công ty</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Về chúng tôi
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Tuyển dụng
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Trung tâm trợ giúp
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Liên hệ
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    Điều khoản
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 text-center border-t border-slate-800">
            <p className="text-sm text-slate-400">
              © 2026 Chat Me Now. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
