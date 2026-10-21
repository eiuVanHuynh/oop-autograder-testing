// target_json = { testIds: ['TC-05', …] }: chạy đúng những test được liệt kê.
// target_json = { testIds: ['TC-05', …] }: run exactly the listed tests.
//
// Cần làm / To do:
// - Vẫn phải kiểm từng tc_code có tồn tại và đang 'ready'; mã lạ thì bỏ hoặc báo 400.
// - Đừng tin thẳng dữ liệu người dùng gửi lên rồi nhét vào biểu thức grep.
class TestIdsTargetStrategy {
  constructor(catalogRepository) {
    this.catalogRepository = catalogRepository;
  }

  // TODO: async resolve({ testIds })
}

module.exports = TestIdsTargetStrategy;
