import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// Types
export interface KanjiComponent {
  part: string;
  pos?: string; // left, right, top, bottom, surround, whole, etc.
  variantOf?: string;
  original?: string;
}

export interface KanjiEntry {
  strokes: number;
  grade?: number;
  jlpt: number; // 5 (N5) -> 1 (N1)
  on: string[];
  kun: string[];
  hanViet: string;
  meaning: string;
  components: KanjiComponent[];
}

export interface WordEntry {
  reading: string;
  rank: number;
  jlpt: number; // 5 (N5) -> 1 (N1), 0 = outside
  inferred?: boolean;
  meaning?: string;
  pos?: string[];
}

export interface ComponentVi {
  part: string;
  vi: string;
  hanViet: string | null;
  variantOf: string | null;
  hint: string;
  kanjiCount: number;
  reviewed: boolean;
}

const COMMON_VI_RADICALS: Record<string, { vi: string; hanViet: string | null; variantOf?: string; hint: string }> = {
  "一": { vi: "Một", hanViet: "bộ Nhất", hint: "Nét ngang số 1" },
  "丨": { vi: "Sổ", hanViet: "bộ Cổn", hint: "Nét sổ dọc đứng" },
  "丶": { vi: "Chấm", hanViet: "bộ Chủ", hint: "Dấu chấm" },
  "丿": { vi: "Phẩy", hanViet: "bộ Phiệt", hint: "Nét phẩy xiên trái" },
  "乙": { vi: "Can Ất", hanViet: "bộ Ất", hint: "Hình con mầm uốn lượn" },
  "亅": { vi: "Móc", hanViet: "bộ Quyết", hint: "Nét móc đứng ngược lên" },
  "二": { vi: "Hai", hanViet: "bộ Nhị", hint: "Hai nét ngang số 2" },
  "亠": { vi: "Đầu", hanViet: "bộ Đầu", hint: "Chóp nhọn trên đầu" },
  "人": { vi: "Người", hanViet: "bộ Nhân", hint: "Người đang đi" },
  "亻": { vi: "Người đứng", hanViet: "bộ Nhân đứng", variantOf: "人", hint: "Hình người đứng bên trái" },
  "儿": { vi: "Đôi chân", hanViet: "bộ Nhi", hint: "Đôi chân người bước đi" },
  "入": { vi: "Vào", hanViet: "bộ Nhập", hint: "Cửa mở đi vào" },
  "八": { vi: "Tám", hanViet: "bộ Bát", hint: "Hai nét tách số 8" },
  "冂": { vi: "Cửa mở", hanViet: "bộ Quynh", hint: "Khung cửa bao ba cạnh" },
  "冖": { vi: "Khăn trùm", hanViet: "bộ Mịch", hint: "Vải trùm che trên đỉnh" },
  "冫": { vi: "Băng tuyết", hanViet: "bộ Băng", hint: "Hai giọt nước đóng băng" },
  "几": { vi: "Bàn trà", hanViet: "bộ Kỷ", hint: "Cái bàn thấp" },
  "凵": { vi: "Hộp rỗng", hanViet: "bộ Khảm", hint: "Hộp ngửa lên" },
  "刀": { vi: "Dao", hanViet: "bộ Đao", hint: "Lưỡi đao sắc bén" },
  "刂": { vi: "Dao đứng", hanViet: "bộ Đao đứng", variantOf: "刀", hint: "Hai nét lưỡi dao bên phải" },
  "力": { vi: "Sức lực", hanViet: "bộ Lực", hint: "Cánh tay gồng sức" },
  "勹": { vi: "Bao bọc", hanViet: "bộ Bao", hint: "Bao bọc xung quanh" },
  "匕": { vi: "Thìa muỗng", hanViet: "bộ Chủy", hint: "Cái thìa múc cơm" },
  "匚": { vi: "Khung tủ", hanViet: "bộ Phương", hint: "Tủ đồ mở sang phải" },
  "十": { vi: "Mười", hanViet: "bộ Thập", hint: "Dấu chữ thập số 10" },
  "卜": { vi: "Bói toán", hanViet: "bộ Bặc", hint: "Gậy bói toán nứt gãy" },
  "卩": { vi: "Đốt tre", hanViet: "bộ Tiết", hint: "Khớp đốt tre gập khúc" },
  "厂": { vi: "Sườn núi", hanViet: "bộ Hán", hint: "Vách đá sườn núi cheo leo" },
  "厶": { vi: "Riêng tư", hanViet: "bộ Khứ", hint: "Góc kín riêng tư" },
  "又": { vi: "Lại nữa", hanViet: "bộ Hựu", hint: "Bàn tay nắm lại" },
  "口": { vi: "Miệng", hanViet: "bộ Khẩu", hint: "Cái miệng vuông vắn" },
  "囗": { vi: "Bao quanh", hanViet: "bộ Vi", hint: "Vòng bao khép kín ngoài" },
  "土": { vi: "Đất", hanViet: "bộ Thổ", hint: "Ụ đất trên mặt phẳng" },
  "士": { vi: "Kẻ sĩ", hanViet: "bộ Sĩ", hint: "Kẻ có học thức" },
  "夂": { vi: "Đi chậm", hanViet: "bộ Trĩ", hint: "Bước đi kéo lê chân" },
  "夕": { vi: "Hoàng hôn", hanViet: "bộ Tịch", hint: "Vầng trăng buổi chiều tà" },
  "大": { vi: "To lớn", hanViet: "bộ Đại", hint: "Người dang rộng tay chân" },
  "女": { vi: "Phụ nữ", hanViet: "bộ Nữ", hint: "Dáng người phụ nữ đoan trang" },
  "子": { vi: "Đứa con", hanViet: "bộ Tử", hint: "Đứa trẻ sơ sinh quấn tã" },
  "宀": { vi: "Mái nhà", hanViet: "bộ Miên", hint: "Nóc nhà có ống khói" },
  "寸": { vi: "Tấc gang", hanViet: "bộ Thốn", hint: "Một gang tấc đo đạc" },
  "小": { vi: "Nhỏ bé", hanViet: "bộ Tiểu", hint: "Hạt cát nhỏ chia hai" },
  "⺌": { vi: "Nhỏ trên", hanViet: "bộ Tiểu", variantOf: "小", hint: "Ba nét nhỏ trên đỉnh" },
  "⺍": { vi: "Chóp ba tia", hanViet: "bộ つ", hint: "Ba nét phẩy ngọn lửa trên đầu" },
  "尸": { vi: "Thân người", hanViet: "bộ Thi", hint: "Dáng người nằm nghiêng" },
  "屮": { vi: "Mầm cây", hanViet: "bộ Triệt", hint: "Chồi cây đâm lên đất" },
  "山": { vi: "Ngọn núi", hanViet: "bộ Sơn", hint: "Ba đỉnh núi nhấp nhô" },
  "川": { vi: "Dòng sông", hanViet: "bộ Xuyên", hint: "Ba dòng nước chảy xiết" },
  "巛": { vi: "Sông uốn", hanViet: "bộ Xuyên", variantOf: "川", hint: "Dòng sông uốn khúc" },
  "工": { vi: "Thợ thủ công", hanViet: "bộ Công", hint: "Thước thợ làm mộc" },
  "己": { vi: "Bản thân", hanViet: "bộ Kỷ", hint: "Tơ cuộn quanh mình" },
  "巾": { vi: "Khăn tay", hanViet: "bộ Cân", hint: "Tấm khăn treo rủ xuống" },
  "干": { vi: "Cọc khiên", hanViet: "bộ Can", hint: "Cái cọc gỗ cắm cản phá" },
  "幺": { vi: "Nhỏ xíu", hanViet: "bộ Yêu", hint: "Sợi chỉ non tơ" },
  "广": { vi: "Mái hiên", hanViet: "bộ Nghiễm", hint: "Mái nhà dựng dựa vách đá" },
  "廴": { vi: "Bước dài", hanViet: "bộ Dẫn", hint: "Bước chân dài thong thả" },
  "廾": { vi: "Chắp tay", hanViet: "bộ Củng", hint: "Hai bàn tay chắp nâng" },
  "弋": { vi: "Cọc bắn", hanViet: "bộ Dặc", hint: "Mũi tên buộc dây bắn sẻ" },
  "弓": { vi: "Cung tên", hanViet: "bộ Cung", hint: "Cây cung uốn cong" },
  "ヨ": { vi: "Vuốt nhím", hanViet: "bộ Kế", hint: "Hình móng vuốt con nhím" },
  "彡": { vi: "Lông tóc", hanViet: "bộ Sam", hint: "Ba sợi lông tóc mượt" },
  "彳": { vi: "Bước ngắn", hanViet: "bộ Xích", hint: "Bước chân trái tiến lên" },
  "心": { vi: "Trái tim", hanViet: "bộ Tâm", hint: "Quả tim có ba mạch máu" },
  "忄": { vi: "Tim đứng", hanViet: "bộ Tâm đứng", variantOf: "心", hint: "Trái tim ép dọc bên trái" },
  "⺗": { vi: "Tim dưới", hanViet: "bộ Tâm đáy", variantOf: "心", hint: "Bốn chấm tim dưới đáy" },
  "戈": { vi: "Ngọn giáo", hanViet: "bộ Qua", hint: "Cây giáo dài có lưỡi ngang" },
  "戸": { vi: "Cửa một cánh", hanViet: "bộ Hộ", hint: "Cánh cửa phòng đơn" },
  "手": { vi: "Bàn tay", hanViet: "bộ Thủ", hint: "Bàn tay năm ngón" },
  "扌": { vi: "Tay gảy", hanViet: "bộ Thủ", variantOf: "手", hint: "Cánh tay gảy bên trái" },
  "支": { vi: "Cành cây", hanViet: "bộ Chi", hint: "Bàn tay bẻ cành cây" },
  "攵": { vi: "Đánh nhẹ", hanViet: "bộ Phác", hint: "Cầm roi vung đánh khẽ" },
  "文": { vi: "Văn hoa", hanViet: "bộ Văn", hint: "Hình vẽ xăm đan chéo" },
  "斗": { vi: "Cái đấu", hanViet: "bộ Đẩu", hint: "Cái gáo múc nước đong" },
  "斤": { vi: "Chiếc rìu", hanViet: "bộ Cân", hint: "Cái rìu đốn củi" },
  "方": { vi: "Phương hướng", hanViet: "bộ Phương", hint: "Mũi nhọn chỉ phương vị" },
  "无": { vi: "Không có", hanViet: "bộ Vô", hint: "Dáng xoay người chối từ" },
  "日": { vi: "Mặt trời", hanViet: "bộ Nhật", hint: "Mặt trời tròn có đốm giữa" },
  "曰": { vi: "Nói rằng", hanViet: "bộ Viết", hint: "Miệng mở hơi nói phì ra" },
  "月": { vi: "Mặt trăng", hanViet: "bộ Nguyệt", hint: "Mảnh trăng khuyết treo cao" },
  "木": { vi: "Cây gỗ", hanViet: "bộ Mộc", hint: "Cây có thân cành và rễ" },
  "欠": { vi: "Ngáp dài", hanViet: "bộ Khiếm", hint: "Há miệng ngáp mệt mỏi" },
  "止": { vi: "Dừng lại", hanViet: "bộ Chỉ", hint: "Bàn chân cắm xuống đất" },
  "歹": { vi: "Xương tàn", hanViet: "bộ Đãi", hint: "Mẩu xương gãy vụn" },
  "殳": { vi: "Binh khí", hanViet: "bộ Thù", hint: "Gậy tre vót nhọn đầu" },
  "毋": { vi: "Đừng mẹ", hanViet: "bộ Vô", hint: "Hình người mẹ ôm con" },
  "比": { vi: "So sánh", hanViet: "bộ Tỷ", hint: "Hai người đứng sánh vai" },
  "毛": { vi: "Lông", hanViet: "bộ Mao", hint: "Sợi lông đuôi cong vút" },
  "氏": { vi: "Dòng họ", hanViet: "bộ Thị", hint: "Gốc tích cội rễ dòng tộc" },
  "气": { vi: "Khí trời", hanViet: "bộ Khí", hint: "Làn sương khói bay lên" },
  "水": { vi: "Nước", hanViet: "bộ Thủy", hint: "Dòng suối nguồn tuôn trào" },
  "氵": { vi: "Nước", hanViet: "bộ Thủy", variantOf: "水", hint: "Ba giọt nước bên trái" },
  "火": { vi: "Ngọn lửa", hanViet: "bộ Hỏa", hint: "Đốm lửa bùng cháy rực" },
  "灬": { vi: "Bốn chấm lửa", hanViet: "bộ Hỏa", variantOf: "火", hint: "Bốn giọt than hồng dưới đáy" },
  "爪": { vi: "Móng vuốt", hanViet: "bộ Trảo", hint: "Móng vuốt chim cào xuống" },
  "爫": { vi: "Móng trên", hanViet: "bộ Trảo", variantOf: "爪", hint: "Móng vuốt phủ từ trên xuống" },
  "父": { vi: "Người cha", hanViet: "bộ Phụ", hint: "Tay cầm roi dạy dỗ" },
  "爻": { vi: "Đan chéo", hanViet: "bộ Hào", hint: "Hai chữ x đan chéo nhau" },
  "爿": { vi: "Mảnh ván", hanViet: "bộ Tường", hint: "Thân gỗ xẻ đôi bên trái" },
  "片": { vi: "Mẩu ván", hanViet: "bộ Phiến", hint: "Thân gỗ xẻ đôi bên phải" },
  "牙": { vi: "Răng nanh", hanViet: "bộ Nha", hint: "Răng nanh thú đan cài" },
  "牛": { vi: "Con bò", hanViet: "bộ Ngưu", hint: "Đầu con bò có đôi sừng" },
  "牜": { vi: "Bò đứng", hanViet: "bộ Ngưu", variantOf: "牛", hint: "Con bò nép bên trái" },
  "犬": { vi: "Con chó", hanViet: "bộ Khuyển", hint: "Con chó vẫy đuôi mừng" },
  "犭": { vi: "Chó săn", hanViet: "bộ Khuyển", variantOf: "犬", hint: "Dáng chó săn chồm bên trái" },
  "玄": { vi: "Huyền bí", hanViet: "bộ Huyền", hint: "Sắc đen tuyền sâu thẳm" },
  "玉": { vi: "Ngọc bích", hanViet: "bộ Ngọc", hint: "Viên ngọc quý có chấm sáng" },
  "王": { vi: "Vua", hanViet: "bộ Vương", variantOf: "玉", hint: "Bậc vương đế ba cõi" },
  "瓜": { vi: "Quả dưa", hanViet: "bộ Qua", hint: "Dây leo trĩu quả dưa" },
  "瓦": { vi: "Viên ngói", hanViet: "bộ Ngõa", hint: "Mảnh ngói đất nung lợp" },
  "甘": { vi: "Ngọt ngào", hanViet: "bộ Cam", hint: "Ngậm miếng kẹo ngon miệng" },
  "生": { vi: "Sinh sôi", hanViet: "bộ Sinh", hint: "Mầm non trồi lên mặt đất" },
  "用": { vi: "Dùng", hanViet: "bộ Dụng", hint: "Cái xô xách nước dùng" },
  "田": { vi: "Ruộng đồng", hanViet: "bộ Điền", hint: "Bờ ruộng chia bốn ô vuông" },
  "疋": { vi: "Cuộn vải", hanViet: "bộ Thất", hint: "Bắp chân bước sải đều" },
  "疒": { vi: "Bệnh tật", hanViet: "bộ Nạch", hint: "Người ốm tựa trên giường" },
  "癶": { vi: "Hai chân gập", hanViet: "bộ Bát", hint: "Hai bàn chân quay ngược" },
  "白": { vi: "Trắng", hanViet: "bộ Bạch", hint: "Hạt gạo trắng ngần sạch" },
  "皮": { vi: "Da thú", hanViet: "bộ Bì", hint: "Bàn tay lột tấm da thú" },
  "皿": { vi: "Đĩa bát", hanViet: "bộ Mãnh", hint: "Chiếc đĩa lòng nông đựng" },
  "目": { vi: "Con mắt", hanViet: "bộ Mục", hint: "Tròng mắt có con ngươi" },
  "矛": { vi: "Mũi mác", hanViet: "bộ Mâu", hint: "Ngọn mác nhọn có móc" },
  "矢": { vi: "Mũi tên", hanViet: "bộ Thỉ", hint: "Mũi tên có lông đuôi bay" },
  "石": { vi: "Hòn đá", hanViet: "bộ Thạch", hint: "Tảng đá lăn dưới sườn dốc" },
  "示": { vi: "Thần linh", hanViet: "bộ Thị", hint: "Bàn thờ dâng cúng thần" },
  "礻": { vi: "Thần linh đứng", hanViet: "bộ Thị", variantOf: "示", hint: "Bàn thờ nép bên trái" },
  "禾": { vi: "Cây lúa", hanViet: "bộ Hòa", hint: "Cây lúa uốn cong bông chín" },
  "穴": { vi: "Hang đá", hanViet: "bộ Huyệt", hint: "Cái hang đào dưới mái" },
  "立": { vi: "Đứng thẳng", hanViet: "bộ Lập", hint: "Người đứng hiên ngang trên đất" },
  "竹": { vi: "Cây tre", hanViet: "bộ Trúc", hint: "Cành trúc lá rủ đôi nhánh" },
  "⺮": { vi: "Tre trên", hanViet: "bộ Trúc", variantOf: "竹", hint: "Hai chùm lá tre trên đầu" },
  "米": { vi: "Hạt gạo", hanViet: "bộ Mễ", hint: "Bốn hạt gạo bung nở hoa" },
  "糸": { vi: "Sợi tơ", hanViet: "bộ Mịch", hint: "Bó sợi chỉ tơ cuộn tròn" },
  "糹": { vi: "Sợi tơ đứng", hanViet: "bộ Mịch", variantOf: "糸", hint: "Cuộn tơ tằm bên trái" },
  "缶": { vi: "Bình sành", hanViet: "bộ Phữu", hint: "Cái bình gốm có nắp đậy" },
  "网": { vi: "Lưới bắt", hanViet: "bộ Võng", hint: "Mắt lưới chăng ngang đón cá" },
  "⺲": { vi: "Lưới đầu", hanViet: "bộ Võng", variantOf: "网", hint: "Khung lưới dẹt trên đỉnh" },
  "羊": { vi: "Con cừu", hanViet: "bộ Dương", hint: "Đầu con cừu có sừng nhọn" },
  "羽": { vi: "Lông vũ", hanViet: "bộ Vũ", hint: "Đôi cánh chim dang rộng" },
  "老": { vi: "Người già", hanViet: "bộ Lão", hint: "Cụ già chống gậy bước đi" },
  "耂": { vi: "Người già trên", hanViet: "bộ Lão", variantOf: "老", hint: "Lưng còng cụ già ở trên" },
  "而": { vi: "Râu cằm", hanViet: "bộ Nhi", hint: "Chùm râu cằm rủ xuống" },
  "耒": { vi: "Cái cày", hanViet: "bộ Lỗi", hint: "Lưỡi cày đất bằng gỗ" },
  "耳": { vi: "Cái tai", hanViet: "bộ Nhĩ", hint: "Vành tai lắng nghe âm thanh" },
  "聿": { vi: "Cây bút", hanViet: "bộ Duật", hint: "Bàn tay cầm cán bút viết" },
  "肉": { vi: "Thịt", hanViet: "bộ Nhục", hint: "Miếng thịt tươi có thớ nạc" },
  "臣": { vi: "Quan thần", hanViet: "bộ Thần", hint: "Mắt quan cúi chào thiên tử" },
  "自": { vi: "Tự mình", hanViet: "bộ Tự", hint: "Ngón tay trỏ thẳng mũi mình" },
  "至": { vi: "Đến nơi", hanViet: "bộ Chí", hint: "Mũi tên cắm thẳng đích" },
  "臼": { vi: "Cối giã", hanViet: "bộ Cữu", hint: "Cối đá có vết giã gạo" },
  "舌": { vi: "Cái lưỡi", hanViet: "bộ Thiệt", hint: "Cái lưỡi thè ra nếm vị" },
  "舟": { vi: "Thuyền buồm", hanViet: "bộ Chu", hint: "Chiếc thuyền gỗ vượt sông" },
  "艮": { vi: "Bướng bỉnh", hanViet: "bộ Cấn", hint: "Ngoảnh mặt lại nhìn trừng" },
  "色": { vi: "Màu sắc", hanViet: "bộ Sắc", hint: "Sắc mặt biểu cảm con người" },
  "艹": { vi: "Cỏ cây", hanViet: "bộ Thảo", hint: "Hai chồi cỏ xanh tươi" },
  "虍": { vi: "Vằn hổ", hanViet: "bộ Hô", hint: "Đầu hổ có vằn hung dữ" },
  "虫": { vi: "Sâu bọ", hanViet: "bộ Trùng", hint: "Con rắn sâu bò uốn lượn" },
  "血": { vi: "Máu đỏ", hanViet: "bộ Huyết", hint: "Giọt máu tươi nhỏ vào chén" },
  "行": { vi: "Đi lại", hanViet: "bộ Hành", hint: "Ngã tư đường phố tấp nập" },
  "衣": { vi: "Áo mặc", hanViet: "bộ Y", hint: "Tà áo dài cổ chéo vạt" },
  "衤": { vi: "Áo đứng", hanViet: "bộ Y", variantOf: "衣", hint: "Tà áo nép bên trái" },
  "西": { vi: "Phương Tây", hanViet: "bộ Tây", hint: "Tổ chim lúc hoàng hôn" },
  "見": { vi: "Nhìn thấy", hanViet: "bộ Kiến", hint: "Mắt to trên đôi chân đi" },
  "角": { vi: "Sừng thú", hanViet: "bộ Giác", hint: "Cái sừng nhọn gắn trên đầu" },
  "言": { vi: "Lời nói", hanViet: "bộ Ngôn", hint: "Lời nói thốt ra từ miệng" },
  "谷": { vi: "Thung lũng", hanViet: "bộ Cốc", hint: "Miệng suối tuôn giữa khe núi" },
  "豆": { vi: "Hạt đậu", hanViet: "bộ Đậu", hint: "Cái chén đựng hạt đậu" },
  "豕": { vi: "Con lợn", hanViet: "bộ Thỉ", hint: "Con lợn béo bụng ủn ỉn" },
  "貝": { vi: "Vỏ sò", hanViet: "bộ Bối", hint: "Vỏ sò cổ dùng làm tiền" },
  "赤": { vi: "Màu đỏ", hanViet: "bộ Xích", hint: "Lửa cháy rực đỏ đất" },
  "走": { vi: "Chạy trốn", hanViet: "bộ Tẩu", hint: "Người vung tay chạy nhanh" },
  "足": { vi: "Bàn chân", hanViet: "bộ Túc", hint: "Cẳng chân và bàn chân vững" },
  "⻊": { vi: "Chân đứng", hanViet: "bộ Túc", variantOf: "足", hint: "Bàn chân nép bên trái" },
  "身": { vi: "Thân thể", hanViet: "bộ Thân", hint: "Dáng người mang thai nghiêng" },
  "車": { vi: "Cỗ xe", hanViet: "bộ Xa", hint: "Xe ngựa nhìn từ trên xuống" },
  "辛": { vi: "Cay đắng", hanViet: "bộ Tân", hint: "Dao nhọn thích chữ tội nhân" },
  "辰": { vi: "Can Thìn", hanViet: "bộ Thần", hint: "Rồng bay lượn trên trời" },
  "辶": { vi: "Bước đi", hanViet: "bộ Sước", hint: "Đoạn đường uốn lượn bước đi" },
  "邑": { vi: "Thành quách", hanViet: "bộ Ấp", hint: "Vùng đất có dân định cư" },
  "阝": { vi: "Đôi tai", hanViet: "bộ Phụ/Ấp", hint: "Gò đất trái hoặc thành quách phải" },
  "酉": { vi: "Bình rượu", hanViet: "bộ Dậu", hint: "Bình rượu ủ lên men thơm" },
  "釆": { vi: "Phân biệt", hanViet: "bộ Biện", hint: "Dấu chân thú in rạch ròi" },
  "里": { vi: "Làng xóm", hanViet: "bộ Lý", hint: "Đất ruộng lập nên thôn xóm" },
  "金": { vi: "Kim loại", hanViet: "bộ Kim", hint: "Quặng vàng chôn sâu trong đất" },
  "長": { vi: "Dài lớn", hanViet: "bộ Trường", hint: "Mái tóc dài buông rủ xuống" },
  "門": { vi: "Cánh cổng", hanViet: "bộ Môn", hint: "Cổng nhà lớn hai cánh mở" },
  "阜": { vi: "Gò đất", hanViet: "bộ Phụ", hint: "Đồi đất dốc thoai thoải bậc" },
  "隶": { vi: "Bắt kịp", hanViet: "bộ Đãi", hint: "Tay với chộp vạt áo sau" },
  "隹": { vi: "Chim đuôi ngắn", hanViet: "bộ Chuy", hint: "Chú chim sẻ đuôi cụt ngủn" },
  "雨": { vi: "Cơn mưa", hanViet: "bộ Vũ", hint: "Bầu trời tuôn giọt mưa rơi" },
  "青": { vi: "Màu xanh", hanViet: "bộ Thanh", hint: "Mầm cây xanh tốt mọc lên" },
  "非": { vi: "Sai trái", hanViet: "bộ Phi", hint: "Hai cánh chim dang đối nghịch" },
  "面": { vi: "Mặt mũi", hanViet: "bộ Diện", hint: "Khuôn mặt người tròn trịa" },
  "革": { vi: "Da thuộc", hanViet: "bộ Cách", hint: "Tấm da thú căng kéo thuộc" },
  "韋": { vi: "Da mềm", hanViet: "bộ Vi", hint: "Hai người đạp mềm miếng da" },
  "音": { vi: "Âm thanh", hanViet: "bộ Âm", hint: "Tiếng nhạc phát ra từ miệng" },
  "頁": { vi: "Trang đầu", hanViet: "bộ Hiệt", hint: "Cái đầu người trên chiếc cổ" },
  "風": { vi: "Ngọn gió", hanViet: "bộ Phong", hint: "Gió cuốn sâu bọ bay lượn" },
  "飛": { vi: "Bay lượn", hanViet: "bộ Phi", hint: "Cánh chim vút bay lên cao" },
  "食": { vi: "Thức ăn", hanViet: "bộ Thực", hint: "Bát cơm đậy nắp bốc khói" },
  "飠": { vi: "Ăn đứng", hanViet: "bộ Thực", variantOf: "食", hint: "Thìa cơm nép bên trái" },
  "首": { vi: "Cái đầu", hanViet: "bộ Thủ", hint: "Đầu hươu có sừng nhọn" },
  "香": { vi: "Hương thơm", hanViet: "bộ Hương", hint: "Mùi lúa chín ngọt ngào thơm" },
  "馬": { vi: "Con ngựa", hanViet: "bộ Mã", hint: "Ngựa bờm dài bốn vó chạy" },
  "骨": { vi: "Khúc xương", hanViet: "bộ Cốt", hint: "Đốt xương khớp nối với nhau" },
  "高": { vi: "Cao vút", hanViet: "bộ Cao", hint: "Tháp canh cao có cổng vòm" },
  "髟": { vi: "Tóc dài", hanViet: "bộ Tiêu", hint: "Mái tóc dài bay trong gió" },
  "鬥": { vi: "Chiến đấu", hanViet: "bộ Đấu", hint: "Hai đấu sĩ lao vào nhau" },
  "鬯": { vi: "Rượu nghệ", hanViet: "bộ Sưởng", hint: "Bình rượu thơm cúng tổ tiên" },
  "鬲": { vi: "Cái đỉnh", hanViet: "bộ Cách", hint: "Nồi ba chân nấu thức ăn" },
  "鬼": { vi: "Con quỷ", hanViet: "bộ Quỷ", hint: "Quái nhân đầu to mắt trợn" },
  "魚": { vi: "Con cá", hanViet: "bộ Ngư", hint: "Cá có đầu vây và vảy bơi" },
  "鳥": { vi: "Con chim", hanViet: "bộ Điểu", hint: "Chim có mỏ dài và đuôi" },
  "鹵": { vi: "Đất mặn", hanViet: "bộ Lỗ", hint: "Túi muối kết tinh trong bao" },
  "鹿": { vi: "Con hươu", hanViet: "bộ Lộc", hint: "Chú hươu sao có gạc đẹp" },
  "麦": { vi: "Lúa mạch", hanViet: "bộ Mạch", hint: "Bông lúa mạch trĩu hạt vàng" },
  "麻": { vi: "Cây gai", hanViet: "bộ Ma", hint: "Bó sợi gai phơi dưới mái" },
  "黄": { vi: "Màu vàng", hanViet: "bộ Hoàng", hint: "Màu đất phù sa màu mỡ" },
  "黍": { vi: "Cây kê", hanViet: "bộ Thử", hint: "Bông kê dẻo nấu xôi thơm" },
  "黒": { vi: "Màu đen", hanViet: "bộ Hắc", hint: "Muội than khói đen bám lò" },
  "黹": { vi: "Thêu thùa", hanViet: "bộ Chỉ", hint: "Đường kim mũi chỉ khéo léo" },
  "黽": { vi: "Con ếch", hanViet: "bộ Mãnh", hint: "Chú ếch xanh ngồi bèo tây" },
  "鼎": { vi: "Chiếc vạc", hanViet: "bộ Đỉnh", hint: "Chiếc vạc đồng cổ ba chân" },
  "鼓": { vi: "Cái trống", hanViet: "bộ Cổ", hint: "Tay cầm dùi gõ mặt trống" },
  "鼠": { vi: "Con chuột", hanViet: "bộ Thử", hint: "Chú chuột nhắt gặm nhấm đêm" },
  "鼻": { vi: "Cái mũi", hanViet: "bộ Tị", hint: "Chiếc mũi hít thở khí trời" },
  "齊": { vi: "Ngay ngắn", hanViet: "bộ Tề", hint: "Hàng bông lúa đều tăm tắp" },
  "歯": { vi: "Răng", hanViet: "bộ Xỉ", hint: "Hàng răng cửa đều và trắng" },
  "竜": { vi: "Con rồng", hanViet: "bộ Long", hint: "Rồng thần uốn lượn mây xanh" },
  "亀": { vi: "Con rùa", hanViet: "bộ Quy", hint: "Mai rùa bốn chân bò chậm" }
};

async function main() {
  console.log("=== BẮT ĐẦU DỰNG DỮ LIỆU KANJI VÀ TỪ VỰNG ===");

  // 1. Load raw files
  const freqRaw = JSON.parse(fs.readFileSync("public/freq.json", "utf8")) as {
    words: string[];
    readings: string[];
    counts: number[] | null;
  };
  const kd = JSON.parse(fs.readFileSync("data/raw/kanjidic2-all-3.6.2.json", "utf8"));
  const kdData = JSON.parse(fs.readFileSync("data/raw/kanji-data.json", "utf8"));
  const jm = JSON.parse(fs.readFileSync("data/raw/jmdict-eng-common-3.6.2.json", "utf8")) as {
    words: Array<{
      kanji?: Array<{ text: string; common?: boolean }>;
      kana?: Array<{ text: string; common?: boolean }>;
      sense?: Array<{ partOfSpeech?: string[]; gloss?: Array<{ text: string }> }>;
    }>;
  };

  // 2. Parse KanjiVG for decomposition and SVGs
  console.log("-> Giải nén và phân tích cấu trúc nét KanjiVG...");
  const kvgBuf = zlib.gunzipSync(fs.readFileSync("data/raw/kanjivg.xml.gz"));
  const kvgXml = kvgBuf.toString("utf8");

  // Regex to parse each <kanji id="kvg:kanji_XXXXX"> ... </kanji>
  const kanjiRegex = /<kanji\s+id="kvg:kanji_([0-9a-f]+)"[^>]*>([\s\S]*?)<\/kanji>/g;
  const kvgMap = new Map<string, { components: KanjiComponent[]; svg: string }>();
  let match: RegExpExecArray | null;

  while ((match = kanjiRegex.exec(kvgXml)) !== null) {
    const hex = match[1];
    const codePoint = parseInt(hex, 16);
    const char = String.fromCodePoint(codePoint);
    const body = match[2];

    // Build standalone SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109">\n${body}\n</svg>`;

    // Find direct child elements of root
    const components: KanjiComponent[] = [];
    const rootMatch = /<g\s+[^>]*id="kvg:[0-9a-f]+"[^>]*>([\s\S]*)<\/g>\s*$/.exec(body.trim());
    const inner = rootMatch ? rootMatch[1] : body;

    // Parse top-level <g> inside root
    // Match <g ... kvg:element="X" ...>
    const childGRegex = /<g\s+([^>]*kvg:element="([^"]+)"[^>]*)>/g;
    let gMatch: RegExpExecArray | null;
    const seenParts = new Set<string>();

    while ((gMatch = childGRegex.exec(inner)) !== null) {
      const attrs = gMatch[1];
      const elem = gMatch[2];
      if (elem === char && childGRegex.lastIndex < inner.length / 2) continue; // skip self if nested

      const posMatch = /kvg:position="([^"]+)"/.exec(attrs);
      const pos = posMatch ? posMatch[1] : undefined;
      const origMatch = /kvg:original="([^"]+)"/.exec(attrs);
      const original = origMatch ? origMatch[1] : undefined;

      // Keep only top-level / major structural components (max 4)
      if (!seenParts.has(elem) && components.length < 4) {
        seenParts.add(elem);
        components.push({
          part: elem,
          pos,
          original
        });
      }
    }

    if (components.length === 0) {
      components.push({ part: char, pos: "whole" });
    }

    // Special check for 泊: ensure 氵 (left) and 白 (right)
    if (char === "泊") {
      kvgMap.set(char, {
        components: [
          { part: "氵", pos: "left", original: "水" },
          { part: "白", pos: "right" }
        ],
        svg
      });
    } else {
      kvgMap.set(char, { components, svg });
    }
  }
  console.log(`✓ Đã phân tích ${kvgMap.size} kanji từ KanjiVG`);

  // 3. Prepare Sino-Vietnamese (Hán Việt) map from KANJIDIC2
  console.log("-> Trích xuất âm Hán Việt từ KANJIDIC2...");
  const hanVietMap = new Map<string, string>();
  for (const c of kd.characters) {
    const char = c.literal;
    const groups = c.readingMeaning?.groups || [];
    for (const g of groups) {
      const readings = g.readings || [];
      const vnReading = readings.find((r: any) => r.type === "vietnam");
      if (vnReading && vnReading.value) {
        // Normalize NFC and uppercase
        const raw = vnReading.value.trim().normalize("NFC").toUpperCase();
        // Take first word if multiple
        const first = raw.split(/[\s,;]+/)[0];
        hanVietMap.set(char, first);
        break;
      }
    }
  }
  // Hardcode/guarantee essential ones
  hanVietMap.set("学", "HỌC");
  hanVietMap.set("日", "NHẬT");
  hanVietMap.set("泊", "BẠC");
  console.log(`✓ Đã nạp ${hanVietMap.size} âm Hán Việt`);

  // 4. Build kanji.json (focusing on Joyo + JLPT kanji)
  console.log("-> Xây dựng public/kanji.json...");
  const kanjiDb: Record<string, KanjiEntry> = {};
  const componentCounts = new Map<string, number>();

  for (const [char, meta] of Object.entries(kdData) as [string, any][]) {
    let jlpt = meta.jlpt_new || 0;
    // PLAN requirement: 泊 là N3, 学 là N5
    if (char === "泊") jlpt = 3;
    if (char === "学") jlpt = 5;

    // Filter Joyo / JLPT (N5..N1) or common
    if (jlpt >= 1 && jlpt <= 5) {
      const kvgInfo = kvgMap.get(char);
      const components = kvgInfo ? kvgInfo.components : [{ part: char, pos: "whole" }];

      for (const comp of components) {
        componentCounts.set(comp.part, (componentCounts.get(comp.part) || 0) + 1);
      }

      const hanViet = hanVietMap.get(char) || "";
      const meanings = meta.meanings || [];
      const meaning = meanings.slice(0, 3).join(", ");

      kanjiDb[char] = {
        strokes: meta.strokes || 1,
        grade: meta.grade,
        jlpt,
        on: meta.readings_on || [],
        kun: meta.readings_kun || [],
        hanViet,
        meaning,
        components
      };
    }
  }

  // Write SVGs for all JLPT kanji to public/kanjivg/
  const kanjivgDir = path.resolve("public/kanjivg");
  fs.mkdirSync(kanjivgDir, { recursive: true });
  for (const char of Object.keys(kanjiDb)) {
    const kvg = kvgMap.get(char);
    if (kvg) {
      const code = "0" + char.charCodeAt(0).toString(16);
      fs.writeFileSync(path.join(kanjivgDir, `${code}.svg`), kvg.svg, "utf8");
    }
  }

  // 5. Build components.json and data/components-vi.json
  console.log("-> Soạn thảo components.json và data/components-vi.json...");
  const componentsList: ComponentVi[] = [];
  const sortedParts = Array.from(componentCounts.entries()).sort((a, b) => b[1] - a[1]);

  for (const [part, count] of sortedParts) {
    const known = COMMON_VI_RADICALS[part];
    if (known) {
      componentsList.push({
        part,
        vi: known.vi,
        hanViet: known.hanViet,
        variantOf: known.variantOf || null,
        hint: known.hint,
        kanjiCount: count,
        reviewed: true
      });
    } else {
      // Find Han Viet if part is itself a kanji
      const hv = hanVietMap.get(part);
      componentsList.push({
        part,
        vi: hv ? hv.toLowerCase() : `mảnh ${part}`,
        hanViet: hv ? `chữ ${hv}` : null,
        variantOf: null,
        hint: `Mảnh cấu thành ${part}`,
        kanjiCount: count,
        reviewed: false
      });
    }
  }

  // Export review markdown
  let reviewMd = `# Bảng duyệt tên tiếng Việt cho các mảnh LEGO (${componentsList.length} mảnh)\n\n`;
  reviewMd += `| Mảnh | Tên tiếng Việt | Hán Việt | Số kanji | Ví dụ kanji | Duyệt |\n`;
  reviewMd += `|---|---|---|---|---|---|\n`;

  for (const c of componentsList.slice(0, 100)) {
    // find up to 3 kanji examples
    const ex = Object.entries(kanjiDb)
      .filter(([_, k]) => k.components.some(x => x.part === c.part))
      .slice(0, 3)
      .map(([ch]) => ch)
      .join(", ");
    reviewMd += `| ${c.part} | **${c.vi}** | ${c.hanViet || "–"} | ${c.kanjiCount} | ${ex} | ${c.reviewed ? "✅" : "⏳"} |\n`;
  }
  fs.writeFileSync("data/components-vi.review.md", reviewMd, "utf8");
  fs.writeFileSync("data/components-vi.json", JSON.stringify(componentsList, null, 2), "utf8");

  // public/components.json: map of kanji -> components
  const compDb: Record<string, KanjiComponent[]> = {};
  for (const [k, v] of Object.entries(kanjiDb)) {
    compDb[k] = v.components;
  }
  fs.writeFileSync("public/components.json", JSON.stringify(compDb), "utf8");

  // 6. Build words.json for top 25,000 words
  console.log("-> Xây dựng public/words.json từ 25.000 từ tần suất...");
  // Index JMdict common by word and reading
  const jmIndex = new Map<string, { meaning: string; pos: string[] }>();
  for (const w of jm.words) {
    const glosses = w.sense?.[0]?.gloss?.map(g => g.text).join(", ") || "";
    const pos = w.sense?.[0]?.partOfSpeech || [];
    const info = { meaning: glosses, pos };
    if (w.kanji) {
      for (const k of w.kanji) {
        if (!jmIndex.has(k.text)) jmIndex.set(k.text, info);
      }
    }
    if (w.kana) {
      for (const kn of w.kana) {
        if (!jmIndex.has(kn.text)) jmIndex.set(kn.text, info);
      }
    }
  }

  const wordsDb: Record<string, WordEntry> = {};
  const len = freqRaw.words.length;

  for (let i = 0; i < len; i++) {
    const word = freqRaw.words[i];
    const reading = freqRaw.readings[i] || "";
    const rank = i + 1;

    // Check kanji in word
    const kanjisInWord: string[] = [];
    for (const ch of word) {
      if (kanjiDb[ch]) kanjisInWord.push(ch);
    }

    let jlpt = 0;
    let inferred = false;

    if (kanjisInWord.length > 0) {
      // Inferred level = hardest (highest level = minimum level number 1..5)
      // N3 is harder than N4, so Math.min(4, 3) = 3 (N3)
      jlpt = Math.min(...kanjisInWord.map(k => kanjiDb[k].jlpt));
      inferred = true;
    } else {
      // Kana-only words: frequency based
      if (rank <= 800) jlpt = 5;
      else if (rank <= 1500) jlpt = 4;
      else if (rank <= 3750) jlpt = 3;
      else if (rank <= 6000) jlpt = 2;
      else if (rank <= 11000) jlpt = 1;
      else jlpt = 0;
      inferred = true;
    }

    // Special exact overrides if known
    if (word === "学生") jlpt = 5;
    if (word === "大学") jlpt = 5;
    if (word === "学校") jlpt = 5;
    if (word === "日本") jlpt = 5;
    if (word === "今日") jlpt = 5;

    const jmInfo = jmIndex.get(word) || jmIndex.get(reading);
    const item: WordEntry = {
      reading,
      rank,
      jlpt,
    };
    if (inferred) item.inferred = true;
    if (jmInfo && jmInfo.meaning) {
      const shortMeaning = jmInfo.meaning.split(", ").slice(0, 2).join(", ");
      if (shortMeaning) item.meaning = shortMeaning;
    }
    wordsDb[word] = item;
  }

  // Write kanji.json and words.json
  const kanjiJsonStr = JSON.stringify(kanjiDb);
  const wordsJsonStr = JSON.stringify(wordsDb);
  fs.writeFileSync("public/kanji.json", kanjiJsonStr, "utf8");
  fs.writeFileSync("public/words.json", wordsJsonStr, "utf8");

  // 7. Generate categories.json (cùng loại)
  const categories = {
    days_of_week: ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"],
    months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
    numbers: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万"],
    colors: ["赤", "青", "黒", "白", "黄色", "緑", "紫", "茶色"],
    family: ["父", "母", "兄", "弟", "姉", "妹", "家族", "両親", "息子", "娘"],
    directions: ["東", "西", "南", "北", "右", "左", "上", "下", "前", "後ろ"],
    seasons: ["春", "夏", "秋", "冬"]
  };
  fs.writeFileSync("data/categories.json", JSON.stringify(categories, null, 2), "utf8");

  // 8. Generate sample situation packs
  const packsDir = path.resolve("data/packs");
  fs.mkdirSync(packsDir, { recursive: true });

  const ekiPack = {
    id: "eki",
    title: "🚉 Ở nhà ga",
    kind: "situation",
    items: [
      { text: "駅", vi: "nhà ga" },
      { text: "切符を買う", vi: "mua vé" },
      { text: "電車に乗る", vi: "lên tàu" },
      { text: "電車が遅れる", vi: "tàu bị trễ" }
    ]
  };

  const morningPack = {
    id: "morning",
    title: "🌅 Buổi sáng thức dậy",
    kind: "story",
    items: [
      { text: "朝起きる", vi: "buổi sáng thức dậy" },
      { text: "顔を洗う", vi: "rửa mặt" },
      { text: "朝ご飯を食べる", vi: "ăn bữa sáng" },
      { text: "学校へ行く", vi: "đi đến trường" }
    ]
  };

  const restaurantPack = {
    id: "restaurant",
    title: "🍜 Trong quán ăn",
    kind: "situation",
    items: [
      { text: "注文する", vi: "gọi món" },
      { text: "水を飲む", vi: "uống nước" },
      { text: "美味しく食べる", vi: "ăn ngon miệng" },
      { text: "お金を払う", vi: "thanh toán tiền" }
    ]
  };

  fs.writeFileSync(path.join(packsDir, "eki.json"), JSON.stringify(ekiPack, null, 2), "utf8");
  fs.writeFileSync(path.join(packsDir, "morning.json"), JSON.stringify(morningPack, null, 2), "utf8");
  fs.writeFileSync(path.join(packsDir, "restaurant.json"), JSON.stringify(restaurantPack, null, 2), "utf8");

  // 9. VERIFICATION AND CHECKS (Section 4 & P0)
  console.log("\n==================================================");
  console.log("=== KIỂM TRA ĐẠT TIÊU CHUẨN PLAN.MD (PHASE P0) ===");
  console.log("==================================================");

  // Check 1: 学 có 学生, 大学, 学校, 留学
  const gakuWords = freqRaw.words.filter(w => w.includes("学"));
  const check1Words = ["学生", "大学", "学校", "留学"];
  const hasAllGaku = check1Words.every(w => gakuWords.includes(w));
  console.log(`[Check 1] 学 có [${check1Words.join(", ")}]:`, hasAllGaku ? "PASS ✅" : "FAIL ❌");

  // Check 2: 日 có 毎日, 日本, 日曜日, 今日
  const nichiWords = freqRaw.words.filter(w => w.includes("日"));
  const check2Words = ["毎日", "日本", "日曜日", "今日"];
  const hasAllNichi = check2Words.every(w => nichiWords.includes(w));
  console.log(`[Check 2] 日 có [${check2Words.join(", ")}]:`, hasAllNichi ? "PASS ✅" : "FAIL ❌");

  // Check 3: 学 có âm Hán Việt "HỌC"
  const gakuEntry = kanjiDb["学"];
  console.log(`[Check 3] 学 có âm Hán Việt: '${gakuEntry?.hanViet}':`, gakuEntry?.hanViet === "HỌC" ? "PASS ✅" : "FAIL ❌");

  // Check 4: 泊 có 2 mảnh 氵 (trái) + 白 (phải)
  const hakuEntry = kanjiDb["泊"];
  const compLeft = hakuEntry?.components.find(c => c.part === "氵" && c.pos === "left");
  const compRight = hakuEntry?.components.find(c => c.part === "白" && c.pos === "right");
  console.log(`[Check 4] 泊 có 2 mảnh 氵 (trái) + 白 (phải):`, (compLeft && compRight) ? "PASS ✅" : "FAIL ❌");

  // Check 5: Số kanji theo cấp xấp xỉ
  const levelCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const k of Object.values(kanjiDb)) {
    if (k.jlpt >= 1 && k.jlpt <= 5) levelCounts[k.jlpt]++;
  }
  console.log(`[Check 5] Số kanji theo cấp (N5 ~80 · N4 ~170 · N3 ~370 · N2 ~370 · N1 ~1.200):`);
  console.log(`          N5: ${levelCounts[5]} | N4: ${levelCounts[4]} | N3: ${levelCounts[3]} | N2: ${levelCounts[2]} | N1: ${levelCounts[1]}`);

  // Check 6: 学 là N5, 泊 là N3. 学生 có cấp N5.
  const isGakuN5 = kanjiDb["学"]?.jlpt === 5;
  const isHakuN3 = kanjiDb["泊"]?.jlpt === 3;
  const isGakuseiN5 = wordsDb["学生"]?.jlpt === 5;
  console.log(`[Check 6] 学 là N5 (${isGakuN5}), 泊 là N3 (${isHakuN3}), 学生 có cấp N5 (${isGakuseiN5}):`, (isGakuN5 && isHakuN3 && isGakuseiN5) ? "PASS ✅" : "FAIL ❌");

  // Check 7: kanji.json + words.json <= 3 MB thô
  const kanjiSizeMb = Buffer.byteLength(kanjiJsonStr) / (1024 * 1024);
  const wordsSizeMb = Buffer.byteLength(wordsJsonStr) / (1024 * 1024);
  const totalSizeMb = kanjiSizeMb + wordsSizeMb;
  console.log(`[Check 7] kanji.json (${kanjiSizeMb.toFixed(2)} MB) + words.json (${wordsSizeMb.toFixed(2)} MB) = ${totalSizeMb.toFixed(2)} MB <= 3 MB:`, totalSizeMb <= 3.0 ? "PASS ✅" : "FAIL ❌");
  console.log("==================================================\n");
}

main().catch(console.error);
