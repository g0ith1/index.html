// بيانات الاتصال بـ Supabase
const SUPABASE_URL = 'ضع_رابط_مشروعك_هنا';
const SUPABASE_KEY = 'ضع_مفتاح_الكين_هنا';

// إنشاء الاتصال وتعيينه في window لضمان وصول كافة الملفات إليه
window.db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const db = window.db;

