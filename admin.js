const Admin = {
    allShifts: [],

    async init() {
        await this.loadMetrics();
        await this.loadEmployees();
        await this.loadShifts();
    },

    // 1. تحميل الإحصائيات
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

    // 2. تحميل الموظفين
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

    // 3. إضافة الموظف المباشرة
    async addNewEmpDirect() {
        const fullName = document.getElementById('inp-fullname')?.value;
        const username = document.getElementById('inp-username')?.value;
        const password = document.getElementById('inp-password')?.value;
        const shiftType = document.getElementById('inp-shifttype')?.value || 'صباحي';

        if (!fullName || !username || !password) {
            alert("يرجى إدخال جميع البيانات المطلوب كتمالها");
            return;
        }

        if (password.length < 6) {
            alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
            return;
        }

        try {
            const { data, error } = await db.rpc('create_new_employee', {
                p_username: username.trim().toLowerCase(),
                p_fullname: fullName.trim(),
                p_password: String(password),
                p_shifttype: shiftType
            });

            if (error) {
                alert("خطأ أثناء الإضافة: " + error.message);
                return;
            }

            if (data && data.success === false) {
                alert("تنبيه: " + (data.error || "اسم المستخدم مستخدم مسبقاً"));
                return;
            }

            alert("تم إضافة الموظف بنجاح!");

            if (typeof closeModal === 'function') closeModal();

            await this.loadEmployees();
            await this.loadMetrics();

        } catch (err) {
            alert("حدث خطأ: " + err.message);
        }
    },

    // 4. تغيير الحالة
    async toggleEmpStatus(id, newStatus) {
        try {
            await db.from('employees').update({ is_active: newStatus }).eq('id', id);
            await this.loadEmployees();
            await this.loadMetrics();
        } catch (e) {
            alert("حدث خطأ أثناء تغيير الحالة");
        }
    },

    // 5. حذف الموظف
    async deleteEmployee(id) {
        if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
        try {
            const { error } = await db.from('employees').delete().eq('id', id);
            if (error) {
                alert("لا يمكن حذف الموظف لوجود شفتات سجّلها باسمه.");
            } else {
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

    // 7. عرض الشفتات
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

    printSingleShift(shiftId) {
        const s = this.allShifts.find(x => x.id === shiftId);
        if (!s) return;
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        printWindow.document.write(`
            <html dir="rtl">
            <head><title>طباعة الشفت - ${s.employees?.full_name}</title></head>
            <body onload="window.print();window.close();">
                <h2>فاتورة شفت</h2>
                <p>الموظف: ${s.employees?.full_name}</p>
                <p>المبلغ النهائي: $${parseFloat(s.final_expected_total || 0).toFixed(2)}</p>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    async editShiftPrompt(shiftId) {
        const s = this.allShifts.find(x => x.id === shiftId);
        if (!s) return;
        const newFinal = prompt("النقد النهائي المتوقع ($):", s.final_expected_total || 0);
        if (newFinal === null) return;
        await db.from('shifts').update({ final_expected_total: parseFloat(newFinal || 0) }).eq('id', shiftId);
        await this.loadShifts();
        await this.loadMetrics();
    },

    async deleteShift(shiftId) {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;
        await db.from('shifts').delete().eq('id', shiftId);
        await this.loadShifts();
        await this.loadMetrics();
    }
};
                      
