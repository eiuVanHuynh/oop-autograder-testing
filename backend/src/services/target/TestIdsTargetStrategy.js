// target_json = { testIds: ['TC-05', …] }: chạy đúng những test được liệt kê.
// target_json = { testIds: ['TC-05', …] }: run exactly the listed tests.
// Mỗi mã phải tồn tại và đang 'ready'; mã lạ bị bỏ. Nhờ vậy chuỗi người dùng gửi lên
// không bao giờ đi thẳng vào biểu thức --grep: chỉ mã đọc lại từ DB mới được dùng.
class TestIdsTargetStrategy {
  constructor(catalogRepository) {
    this.catalogRepository = catalogRepository;
  }

  async resolve({ testIds }) {
    const wanted = [...new Set(testIds.map(String))];
    return this.catalogRepository.findReadyCodesByTcCodes(wanted);
  }
}

module.exports = TestIdsTargetStrategy;
