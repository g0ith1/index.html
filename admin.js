const Admin = {
    async init() {
        await this.loadEmployees();
        await this.loadShifts();
    },

    // 1. عرض جدول الموظفين
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
            console.error("خطأ في تحميل الموظفين:", e);
        }
    },

    // 2. إضافة موظف جديد
    async saveEmployee(id, fullName, email, username, password, shiftType) {
        try {
            const cleanUsername = username ? username.trim().toLowerCase() : '';
            
            if (!cleanUsername || !fullName) {
                alert("يرجى إدخال الاسم واسم المستخدم");
                return;
            }

            if (!password || password.length < 6) {
                alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
                return;
            }

            // إنشاء الحساب في نظام الأمان Supabase
            const { data: authData, error: authErr } = await db.auth.signUp({
                email: `${cleanUsername}@app.local`,
                password: password
            });

            if (authErr) {
                alert("خطأ: " + authErr.message);
                return;
            }

            // إضافة الموظف لجدول الموظفين
            if (authData?.user) {
                const { error: empErr } = await db.from('employees').insert({
                    id: authData.user.id,
                    username: cleanUsername,
                    full_name: fullName,
                    role: 'employee',
                    shift_type: shiftType || 'صباحي',
                    is_active: true
                });

                if (empErr) {
                    alert("خطأ أثناء حفظ البيانات: " + empErr.message);
                    return;
                }
            }

            alert("تم إضافة الموظف بنجاح!");

            // إخفاء النافذة وتحديث الجدول
            const modal = document.getElementById('emp-modal');
            if (modal) modal.style.display = 'none';

            await this.loadEmployees();

        } catch (err) {
            console.error("Save Error:", err);
            alert("حدث خطأ غير متوقع");
        }
    },

    // 3. تعطيل / تفعيل موظف
    async toggleEmpStatus(id, newStatus) {
        await db.from('employees').update({ is_active: newStatus }).eq('id', id);
        await this.loadEmployees();
    },

    // 4. حذف موظف
    async deleteEmployee(id) {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;
        const { error } = await db.from('employees').delete().eq('id', id);
        if (error) {
            alert("لا يمكن حذف الموظف لارتباطه بشفتات مسجلة");
        } else {
            await this.loadEmployees();
        }
    },

    // 5. عرض الشفتات
    async loadShifts() {
        try {
            const { data, error } = await db.from('shifts').select('*, employees(full_name)').order('created_at', { ascending: false });
            if (error) throw error;

            const tbody = document.getElementById('shifts-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            data?.forEach(s => {
                const sales = (s.sold_transactions_total || 0) + (s.misc_sold_total || 0);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${s.employees?.full_name || 'غير معروف'}</td>
                    <td>${s.shift_type || 'صباحي'}</td>
                    <td>${new Date(s.start_time).toLocaleString('ar-IQ')}</td>
                    <td>${s.end_time ? new Date(s.end_time).toLocaleString('ar-IQ') : 'مفتوح'}</td>
                    <td>$${parseFloat(s.initial_cash || 0).toFixed(2)}</td>
                    <td>$${parseFloat(sales).toFixed(2)}</td>
                    <td>$${parseFloat(s.final_expected_total || 0).toFixed(2)}</td>
                    <td>${s.status === 'open' ? 'مفتوح' : 'منتهي'}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="Admin.deleteShift('${s.id}')">حذف</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error("خطأ في تحميل الشفتات:", e);
        }
    },

    // 6. حذف شفت
    async deleteShift(shiftId) {
        if (!confirm("هل أنت متأكد من حذف الشفت؟")) return;
        await db.from('shifts').delete().eq('id', shiftId);
        await this.loadShifts();
    }
};
