// Factory ráp sẵn repository vào service, và service vào controller.
// Factory that wires repositories into services, and services into controllers.
// Nhờ nó, test có thể dựng service với repository giả mà không cần thư viện DI.
// It lets tests build a service with a fake repository, with no DI library.
//
// Cần làm / To do:
// - Mỗi nhóm tính năng thêm đúng một dòng vào đây khi service của nhóm xong.
// - Giữ file này chỉ để nối dây: không có if, không có quy tắc nghiệp vụ.

// TODO: khởi tạo repository rồi truyền vào từng service
module.exports = {};
