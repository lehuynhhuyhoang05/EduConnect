<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Điều khoản sử dụng - EduLMS',
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
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Điều khoản sử dụng</h1>
        <p class="text-gray-600">Cập nhật lần cuối: {{ new Date().toLocaleDateString('vi-VN') }}</p>
      </div>

      <!-- Content -->
      <div class="bg-white rounded-2xl shadow-sm p-8 lg:p-12 space-y-8">
        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Giới thiệu</h2>
          <p class="text-gray-600 leading-relaxed">
            Chào mừng bạn đến với EduLMS - Hệ thống Quản lý Học tập Trực tuyến. 
            Bằng việc sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Đăng ký tài khoản</h2>
          <ul class="list-disc list-inside text-gray-600 space-y-2">
            <li>Bạn phải cung cấp thông tin chính xác và đầy đủ khi đăng ký tài khoản</li>
            <li>Mỗi người chỉ được đăng ký một tài khoản</li>
            <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình</li>
            <li>Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. Quy tắc sử dụng</h2>
          <p class="text-gray-600 leading-relaxed mb-4">Khi sử dụng EduLMS, bạn cam kết:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-2">
            <li>Không chia sẻ tài liệu bản quyền mà không có sự cho phép</li>
            <li>Không sử dụng ngôn ngữ thô tục, xúc phạm trong giao tiếp</li>
            <li>Không spam hoặc gửi tin nhắn quảng cáo</li>
            <li>Không cố gắng truy cập trái phép vào hệ thống</li>
            <li>Tôn trọng quyền riêng tư của người dùng khác</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Quyền sở hữu trí tuệ</h2>
          <p class="text-gray-600 leading-relaxed">
            Tất cả nội dung trên EduLMS, bao gồm nhưng không giới hạn ở văn bản, hình ảnh, video, 
            thiết kế giao diện, đều thuộc quyền sở hữu của EduLMS hoặc các đối tác được cấp phép.
            Việc sao chép, phân phối mà không có sự cho phép bằng văn bản là vi phạm pháp luật.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Giới hạn trách nhiệm</h2>
          <p class="text-gray-600 leading-relaxed">
            EduLMS cung cấp dịch vụ "nguyên trạng" và không đảm bảo rằng dịch vụ sẽ không bị gián đoạn 
            hoặc không có lỗi. Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ 
            việc sử dụng hoặc không thể sử dụng dịch vụ.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">6. Chấm dứt tài khoản</h2>
          <p class="text-gray-600 leading-relaxed">
            Chúng tôi có quyền tạm ngưng hoặc chấm dứt tài khoản của bạn nếu bạn vi phạm các điều khoản này 
            hoặc có hành vi gây hại đến cộng đồng người dùng.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">7. Thay đổi điều khoản</h2>
          <p class="text-gray-600 leading-relaxed">
            Chúng tôi có thể cập nhật các điều khoản này theo thời gian. Việc tiếp tục sử dụng dịch vụ 
            sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">8. Liên hệ</h2>
          <p class="text-gray-600 leading-relaxed">
            Nếu bạn có câu hỏi về các điều khoản này, vui lòng liên hệ chúng tôi qua email: 
            <a href="mailto:support@edulms.vn" class="text-primary hover:underline">support@edulms.vn</a>
          </p>
        </section>
      </div>

      <!-- Footer -->
      <div class="text-center mt-8 text-gray-500 text-sm">
        <p>© {{ new Date().getFullYear() }} EduLMS. Tất cả quyền được bảo lưu.</p>
      </div>
    </div>
  </div>
</template>
