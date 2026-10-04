<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - إدارة الموظفين والشفتات</title>
    <link rel="stylesheet" href="style.css">
    <!-- Supabase JS Client -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>

    <div class="app-container">
        <!-- الشريط الجانبي / الهيدر -->
        <header class="main-header">
            <h1>لوحة تحكم النظام</h1>
            <div class="user-info">
                <span>مرحباً، المدير</span>
            </div>
        </header>

        <!-- كروت الإحصائيات -->
        <section class="metrics-grid">
            <div class="card metric-card">
                <h3>إجمالي الموظفين</h3>
                <p id="m-emp-total">0</p>
            </div>
            <div class="card metric-card">
                <h3>الموظفين النشطين</h3>
                <p id="m-emp-active">0</p>
            </div>
            <div class="card metric-card">
                <h3>الشفتات المفتوحة</h3>
                <p id="m-shifts-open">0</p>
            </div>
            <div class="card metric-card">
                <h3>الشفتات المغلقة</h3>
                <p id="m-shifts-closed">0</p>
            </div>
            <div class="card metric-card">
                <h3>إجمالي المبيعات</h3>
                <p id="m-sales-total">$0.00</p>
            </div>
        </section>

        <!-- قسم إدارة الموظفين -->
        <section class="content-section">
            <div class="section-header">
                <h2>إدارة الموظفين</h2>
                <button class="btn btn-primary" onclick="openEmployeeModal()">+ إضافة موظف جديد</button>
            </div>
            <div class="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>الاسم الكامل</th>
                            <th>اسم المستخدم</th>
                            <th>الحالة</th>
                            <th>الدور</th>
                            <th>نوع الشفت</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="employees-table-body">
                        <!-- يتم تحميل الموظفين تلقائياً هنا -->
                    </tbody>
                </table>
            </div>
        </section>

        <!-- قسم سجل الشفتات -->
        <section class="content-section">
            <div class="section-header">
                <h2>سجل الشفتات</h2>
            </div>
            <div class="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>الموظف</th>
                            <th>نوع الشفت</th>
                            <th>وقت البداية</th>
                            <th>وقت النهاية</th>
                            <th>الرصيد الافتتاحي</th>
                            <th>المبيعات</th>
                            <th>الرصيد المتوقع</th>
                            <th>حالة الشفت</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="shifts-table-body">
                        <!-- يتم تحميل الشفتات تلقائياً هنا -->
                    </tbody>
                </table>
            </div>
        </section>
    </div>

    <!-- نافذة إضافة / تعديل موظف (Employee Modal) -->
    <div id="emp-modal" class="modal" style="display: none;">
        <div class="modal-content card">
            <div class="modal-header">
                <h3 id="modal-title">إضافة موظف جديد</h3>
                <span class="close-btn" onclick="closeEmployeeModal()">&times;</span>
            </div>
            <form id="emp-form" onsubmit="event.preventDefault(); Admin.addNewEmpDirect();">
                <div class="form-group">
                    <label for="emp-fullname">الاسم الكامل:</label>
                    <input type="text" id="emp-fullname" placeholder="مثال: أحمد علي" required>
                </div>
                <div class="form-group">
                    <label for="emp-username">اسم المستخدم (للتسجيل):</label>
                    <input type="text" id="emp-username" placeholder="مثال: ahmed123" required>
                </div>
                <div class="form-group">
                    <label for="emp-password">كلمة المرور:</label>
                    <input type="password" id="emp-password" placeholder="6 أحرف على الأقل" required>
                </div>
                <div class="form-group">
                    <label for="emp-shifttype">نوع الشفت:</label>
                    <select id="emp-shifttype">
                        <option value="صباحي">صباحي</option>
                        <option value="مسائي">مسائي</option>
                        <option value="ليلي">ليلي</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeEmployeeModal()">إلغاء</button>
                    <button type="button" class="btn btn-primary" onclick="Admin.addNewEmpDirect()">حفظ الموظف</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ربط ملفات الجافاسكريبت -->
    <script src="db.js"></script>
    <script src="admin.js"></script>
    <script>
        // دوال فتح وإغلاق النافذة المنبثقة
        function openEmployeeModal() {
            document.getElementById('emp-form').reset();
            document.getElementById('emp-modal').style.display = 'flex';
        }

        function closeEmployeeModal() {
            document.getElementById('emp-modal').style.display = 'none';
        }

        // تشغيل اللوحة عند تحميل الصفحة
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof Admin !== 'undefined') {
                Admin.init();
            }
        });
    </script>
</body>
</html>
