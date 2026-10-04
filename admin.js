const Admin = {
    allShifts: [],

    async init() {
        await this.loadMetrics();
        await this.loadEmployees();
        await this.loadShifts();
    },

    // 1. تحميل إحصائيات النظام
    async loadMetrics() {
        try {
            const { count: empTotal } = await db.from('employees').select('*', { count: 'exact', head: true });
            const { count: empActive } = await db.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true);
            const { count: sOpen } = await db.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'open');
            const { count: sClosed } = await db.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'completed');
            
            const { data: salesData } = await db.from('shifts').select('final_expected_total').eq('status', 'completed');
            const totalRev = salesData ? salesData.reduce((acc, curr) => acc + (parseFloat(curr.final_expected_total) || 0), 0) : 0;

            if (document.getElementById('m-emp-total')) document.getElementById('m-emp-total').textContent = empTotal || 0;
            if (document.getElementById('m-emp-active')) document.getElementById('m-emp-active').textContent = empActive || 0;
            if (document.getElementById('m-shifts-open')) document.getElementById('m-shifts-open').textContent = sOpen || 0;
            if (document.getElementById('m-shifts-closed')) document.getElementById('m-shifts-closed').textContent = sClosed || 0;
            if (document.getElementById('m-sales-total')) document.getElementById('m-sales-total').textContent = `$${totalRev.toFixed(2)}`;
        } catch (e) {
            console.error("Error loading metrics:", e);
        }
    },

    // 2. تحميل وعرض جدول الموظفين
    async loadEmployees() {
        try {
            const { data, error } = await db.from('employees').select('*').order('created_at', { ascending: false });
            if (error) throw error;

            const tbody = document.getElementById('employees-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            data?.forEach(emp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${emp.full_name || '-'}</td>
                    <td>${emp.username || '-'}</td>
                    <td><span class="badge ${emp.is_active ? 'badge-success' : 'badge-danger'}">${emp.is_active ? 'نشط' : 'معطل'}</span></td>
                    <td>${emp.role || 'employee'}</td>
                    <td>${emp.shift_type || 'صباحي'}</td>
                    <td>
                        <button class="btn btn-sm ${emp.is_active ? 'btn-secondary' : 'btn-success'}" 
                            onclick="Admin.toggleEmpStatus('${emp.id}', ${!emp.is_active})">
                            ${emp.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Admin.deleteEmployee('${emp.id}')">حذف</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error("Error loading employees:", e);
        }
    },

    // 3. إضافة أو حفظ موظف باستخدام دالة SQL المجهزة
    async saveEmployee(id, fullName, email, username, password, shiftType) {
        try {
            const cleanUsername = username ? username.trim().toLowerCase() : '';
            
            if (!cleanUsername || !fullName) {
                alert("يرجى كتابة اسم الموظف واسم المستخدم");
                return;
            }

            if (id) {
                // تعديل بيانات موظف حالي
                const { error } = await db.from('employees').update({
                    full_name: fullName,
                    username: cleanUsername,
                    shift_type: shiftType
                }).eq('id', id);

                if (error) throw error;
                App.showToast("تم تعديل بيانات الموظف بنجاح");
            } else {
                // إضافة موظف جديد باستخدام دالة RPC
                if (!password || password.length < 6) {
                    alert("كلمة المرور يجب أن لا تقل عن 6 أحرف");
                    return;
                }

                const { data, error } = await db.rpc('create_new_employee', {
                    p_username: cleanUsername,
                    p_fullname: fullName,
                    p_password: password,
                    p_shifttype: shiftType || 'صباحي'
                });

                if (error) {
                    console.error("RPC Error:", error);
                    alert("خطأ أثناء الإنشاء: " + error.message);
                    return;
                }

                if (data && data.success === false) {
                    alert("لم تتم الإضافة: " + (data.error || "خطأ غير معروف"));
                    return;
                }

                App.showToast("تم إضافة الموظف بنجاح!");
            }

            // إغلاق النافذة المنبثقة وتحديث البيانات
            const modal = document.getElementById('emp-modal');
            if (modal) modal.style.display = 'none';

            await this.loadEmployees();
            await this.loadMetrics();

        } catch (err) {
            console.error("Save Employee Error:", err);
            alert("حدث خطأ: " + (err.message || err));
        }
    },

    // 4. تغيير حالة الموظف (تفعيل / تعطيل)
    async toggleEmpStatus(id, newStatus) {
        try {
            await db.from('employees').update({ is_active: newStatus }).eq('id', id);
            App.showToast("تم تحديث حالة الموظف");
            await this.loadEmployees();
            await this.loadMetrics();
        } catch (e) {
            alert("حدث خطأ أثناء تغيير حالة الموظف");
        }
    },

    // 5. حذف موظف
    async deleteEmployee(id) {
        if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
        try {
            const { error } = await db.from('employees').delete().eq('id', id);
            if (error) {
                alert("لا يمكن حذف الموظف لوجود شفتات سجّلها باسمه.");
            } else {
                App.showToast("تم حذف الموظف بنجاح");
                await this.loadEmployees();
                await this.loadMetrics();
            }
        } catch (e) {
            alert("حدث خطأ أثناء الحذف");
        }
    },

    // 6. تحميل الشفتات
    async loadShifts() {
        try {
            const { data, error } = await db.from('shifts').select('*, employees(full_name)').order('created_at', { ascending: false });
            if (error) throw error;
            this.allShifts = data || [];
            this.renderShifts(this.allShifts);
        } catch (e) {
            console.error("Error loading shifts:", e);
        }
    },

    // 7. عرض جدول الشفتات
    renderShifts(shifts) {
        const tbody = document.getElementById('shifts-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        shifts.forEach(s => {
            const sales = (s.sold_transactions_total || 0) + (s.misc_sold_total || 0);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.employees?.full_name || 'غير معروف'}</td>
                <td><span class="badge">${s.shift_type || 'صباحي'}</span></td>
                <td>${new Date(s.start_time).toLocaleString('ar-IQ')}</td>
                <td>${s.end_time ? new Date(s.end_time).toLocaleString('ar-IQ') : 'مفتوح'}</td>
                <td>$${parseFloat(s.initial_cash || 0).toFixed(2)}</td>
                <td>$${parseFloat(sales).toFixed(2)}</td>
                <td>$${parseFloat(s.final_expected_total || 0).toFixed(2)}</td>
                <td>${s.status === 'open' ? 'مفتوح' : 'منتهي'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="Admin.printSingleShift('${s.id}')">🖨️ طباعة</button>
                    <button class="btn btn-sm btn-secondary" onclick="Admin.editShiftPrompt('${s.id}')">✏️ تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="Admin.deleteShift('${s.id}')">🗑️ حذف</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // 8. طباعة فاتورة شفت مفصلة
    printSingleShift(shiftId) {
        const s = this.allShifts.find(x => x.id === shiftId);
        if (!s) return;

        const sales = (s.sold_transactions_total || 0) + (s.misc_sold_total || 0);
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        printWindow.document.write(`
            <html dir="rtl">
            <head>
                <title>طباعة الشفت - ${s.employees?.full_name}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; text-align: center; }
                    .card { border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
                    .row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px dashed #eee; padding-bottom: 4px; }
                    .total { font-weight: bold; font-size: 1.2em; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>فاتورة شفت مفصلة</h2>
                    <div class="row"><span>الموظف:</span> <strong>${s.employees?.full_name || '-'}</strong></div>
                    <div class="row"><span>نوع الشفت:</span> <strong>${s.shift_type || 'صباحي'}</strong></div>
                    <div class="row"><span>البداية:</span> <strong>${new Date(s.start_time).toLocaleString('ar-IQ')}</strong></div>
                    <div class="row"><span>النهاية:</span> <strong>${s.end_time ? new Date(s.end_time).toLocaleString('ar-IQ') : 'مفتوح'}</strong></div>
                    <hr>
                    <div class="row"><span>المبلغ الابتدائي:</span> <strong>$${parseFloat(s.initial_cash || 0).toFixed(2)}</strong></div>
                    <div class="row"><span>المبلغ المعزز:</span> <strong>$${parseFloat(s.box_replenishment || 0).toFixed(2)}</strong></div>
                    <div class="row"><span>إجمالي المبيعات:</span> <strong>$${sales.toFixed(2)}</strong></div>
                    <div class="row total"><span>النقد المتوقع النهائي:</span> <strong>$${parseFloat(s.final_expected_total || 0).toFixed(2)}</strong></div>
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    // 9. تعديل بيانات الشفت المالية
    async editShiftPrompt(shiftId) {
        const s = this.allShifts.find(x => x.id === shiftId);
        if (!s) return;

        const newInitial = prompt("المبلغ الابتدائي ($):", s.initial_cash || 0);
        if (newInitial === null) return;

        const newReplenish = prompt("المبلغ المعزز ($):", s.box_replenishment || 0);
        if (newReplenish === null) return;

        const currentSales = (s.sold_transactions_total || 0) + (s.misc_sold_total || 0);
        const newSales = prompt("إجمالي المبيعات ($):", currentSales);
        if (newSales === null) return;

        const newFinal = prompt("النقد النهائي المتوقع ($):", s.final_expected_total || 0);
        if (newFinal === null) return;

        const { error } = await db.from('shifts').update({
            initial_cash: parseFloat(newInitial || 0),
            box_replenishment: parseFloat(newReplenish || 0),
            sold_transactions_total: parseFloat(newSales || 0),
            final_expected_total: parseFloat(newFinal || 0)
        }).eq('id', shiftId);

        if (error) {
            alert("حدث خطأ أثناء التعديل: " + error.message);
        } else {
            App.showToast("تم تعديل بيانات الشفت بنجاح");
            await this.loadShifts();
            await this.loadMetrics();
        }
    },

    // 10. حذف الشفت
    async deleteShift(shiftId) {
        if (!confirm("هل أنت متأكد من حذف هذا الشفت نهائياً؟")) return;

        const { error } = await db.from('shifts').delete().eq('id', shiftId);

        if (error) {
            alert("حدث خطأ أثناء الحذف: " + error.message);
        } else {
            App.showToast("تم حذف الشفت بنجاح");
            await this.loadShifts();
            await this.loadMetrics();
        }
    }
};
