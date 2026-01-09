<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Chính sách bảo mật - EduLMS',
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-12">
        <NuxtLink to="/auth/login" class="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại đăng nhập
        </NuxtLink>
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Chính sách bảo mật</h1>
        <p class="text-gray-600">Cập nhật lần cuối: {{ new Date().toLocaleDateString('vi-VN') }}</p>
      </div>

      <!-- Content -->
      <div class="bg-white rounded-2xl shadow-sm p-8 lg:p-12 space-y-8">
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Thu thập thông tin</h2>
          <p class="text-gray-600 leading-relaxed mb-4">
            Chúng tôi thu thập các loại thông tin sau khi bạn sử dụng EduLMS:
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Thông tin cá nhân:</strong> Họ tên, email, số điện thoại khi đăng ký tài khoản</li>
            <li><strong>Thông tin học tập:</strong> Lớp học, bài tập, điểm số, tiến độ học tập</li>
            <li><strong>Dữ liệu sử dụng:</strong> Thời gian truy cập, trang đã xem, tương tác với hệ thống</li>
            <li><strong>Thông tin thiết bị:</strong> Loại trình duyệt, hệ điều hành, địa chỉ IP</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Sử dụng thông tin</h2>
          <p class="text-gray-600 leading-relaxed mb-4">Thông tin của bạn được sử dụng để:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-2">
            <li>Cung cấp và cải thiện dịch vụ học tập</li>
            <li>Cá nhân hóa trải nghiệm người dùng</li>
            <li>Gửi thông báo về lớp học, bài tập và kết quả</li>
            <li>Hỗ trợ kỹ thuật và giải đáp thắc mắc</li>
            <li>Phân tích và cải thiện hiệu suất hệ thống</li>
            <li>Đảm bảo an ninh và phát hiện gian lận</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Chia sẻ thông tin</h2>
          <p class="text-gray-600 leading-relaxed mb-4">
            Chúng tôi <strong>không bán</strong> thông tin cá nhân của bạn. Thông tin chỉ được chia sẻ trong các trường hợp:
          </p>
          <ul class="list-disc list-inside text-gray-600 space-y-2">
            <li>Với giáo viên và quản trị viên lớp học bạn tham gia</li>
            <li>Khi có yêu cầu từ cơ quan pháp luật có thẩm quyền</li>
            <li>Với đối tác công nghệ để vận hành dịch vụ (cam kết bảo mật)</li>
            <li>Khi được sự đồng ý rõ ràng từ bạn</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Bảo mật dữ liệu</h2>
          <p class="text-gray-600 leading-relaxed">
            Chúng tôi áp dụng các biện pháp bảo mật tiên tiến để bảo vệ thông tin của bạn:
          </p>
          <div class="grid md:grid-cols-2 gap-4 mt-4">
            <div class="bg-green-50 rounded-xl p-4">
              <div class="flex items-center gap-3 mb-2">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span class="font-medium text-green-800">Mã hóa SSL/TLS</span>
              </div>
              <p class="text-green-700 text-sm">Mọi dữ liệu truyền tải đều được mã hóa</p>
            </div>
            <div class="bg-blue-50 rounded-xl p-4">
              <div class="flex items-center gap-3 mb-2">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span class="font-medium text-blue-800">Mật khẩu băm</span>
              </div>
              <p class="text-blue-700 text-sm">Mật khẩu được băm an toàn với bcrypt</p>
            </div>
            <div class="bg-purple-50 rounded-xl p-4">
              <div class="flex items-center gap-3 mb-2">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-medium text-purple-800">Kiểm soát truy cập</span>
              </div>
              <p class="text-purple-700 text-sm">Phân quyền chặt chẽ theo vai trò</p>
            </div>
            <div class="bg-orange-50 rounded-xl p-4">
              <div class="flex items-center gap-3 mb-2">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <span class="font-medium text-orange-800">Sao lưu định kỳ</span>
              </div>
              <p class="text-orange-700 text-sm">Dữ liệu được sao lưu hàng ngày</p>
            </div>
          </div>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Quyền của bạn</h2>
          <p class="text-gray-600 leading-relaxed mb-4">Bạn có các quyền sau đối với dữ liệu cá nhân:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Quyền truy cập:</strong> Xem thông tin cá nhân đã cung cấp</li>
            <li><strong>Quyền chỉnh sửa:</strong> Cập nhật thông tin không chính xác</li>
            <li><strong>Quyền xóa:</strong> Yêu cầu xóa tài khoản và dữ liệu</li>
            <li><strong>Quyền xuất dữ liệu:</strong> Tải xuống dữ liệu học tập của bạn</li>
            <li><strong>Quyền từ chối:</strong> Hủy đăng ký nhận email marketing</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">6. Cookies</h2>
          <p class="text-gray-600 leading-relaxed">
            Chúng tôi sử dụng cookies để lưu trữ phiên đăng nhập và cải thiện trải nghiệm người dùng.
            Bạn có thể tắt cookies trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể không hoạt động đúng.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">7. Thay đổi chính sách</h2>
          <p class="text-gray-600 leading-relaxed">
            Chúng tôi có thể cập nhật chính sách này định kỳ. Mọi thay đổi quan trọng sẽ được thông báo 
            qua email hoặc thông báo trong hệ thống.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">8. Liên hệ</h2>
          <p class="text-gray-600 leading-relaxed">
            Nếu bạn có câu hỏi về chính sách bảo mật, vui lòng liên hệ:
          </p>
          <div class="mt-4 bg-gray-50 rounded-xl p-6">
            <p class="text-gray-700"><strong>Email:</strong> <a href="mailto:privacy@edulms.vn" class="text-primary hover:underline">privacy@edulms.vn</a></p>
            <p class="text-gray-700 mt-2"><strong>Hotline:</strong> 1900-xxxx (8:00 - 17:00, T2-T6)</p>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <div class="text-center mt-8 text-gray-500 text-sm">
        <p>© {{ new Date().getFullYear() }} EduLMS. Tất cả quyền được bảo lưu.</p>
      </div>
    </div>
  </div>
</template>
