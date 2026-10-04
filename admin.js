const Admin = {
    allShifts: [],

    async init() {
        await this.loadMetrics();
        await this.loadEmployees();
        await this.loadShifts();
    },

    showTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabId}`)?.classList.add('active');
    },

    async loadMetrics() {
        const { count: empTotal } = await db.from('employees').select('*', { count: 'exact', head: true });
        const { count: empActive } = await db.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true);
        const { count: sOpen } = await db.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'open');
        const { count: sClosed } = await db.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        
        const { data: salesData } = await db.from('shifts').select('final_expected_total').eq('status', 'completed');
        const totalRev = salesData ? salesData.reduce((acc, curr) => acc + (parseFloat(curr.final_expected_total) || 0), 0) : 0;

        document.getElementById('m-emp-total').textContent = empTotal || 0;
        document.getElementById('m-emp-active').textContent = empActive || 0;
        document.getElementById('m-shifts-open').textContent = sOpen || 0;
        document.getElementById('m-shifts-closed').textContent = sClosed || 0;
        document.getElementById('m-sales-total').textContent = `$${totalRev.toFixed(2)}`;
    },

    async loadEmployees() {
        const { data } = await db.from('employees').select('*').order('created_at', { ascending: false });
        const tbody = document.getElementById('employees-table-body');
        const empSelect = document.getElementById('report-emp-select');
        
        if (tbody) tbody.innerHTML = '';
        if (empSelect) empSelect.innerHTML = '<option value="">كل الموظفين</option>';

        data?.forEach(emp => {
            if (empSelect) {
                empSelect.innerHTML += `<option value="${emp.id}">${emp.full_name}</option>`;
            }

            if (tbody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${emp.full_name}</td>
                    <td>${emp.username}</td>
                    <td><span class="badge">${emp.is_active ? 'نشط' : 'معطل'}</span></td>
                    <td>${emp.role}</td>
                    <td>${emp.shift_type || 'صباحي'}</td>
                    <td>
                        <button class="btn btn-sm ${emp.is_active ? 'btn-secondary' : 'btn-success'}" 
                            onclick="Admin.toggleEmpStatus('${emp.id}', ${!emp.is_active})">
                            ${emp.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="Admin.openEditEmpModal('${emp.id}', '${emp.full_name}', '${emp.username}', '${emp.shift_type || 'صباحي'}')">تعديل</button>
                        <button class="btn btn-sm btn-danger" onclick="Admin.deleteEmployee('${emp.id}')">حذف</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });
    },

    async toggleEmpStatus(id, newStatus) {
        await db.from('employees').update({ is_active: newStatus }).eq('id', id);
        App.showToast("تم تحديث حالة الموظف");
        await this.loadEmployees();
    },

    async deleteEmployee(id) {
        if (!confirm("هل أنت تأكد من حذف الموظف نهائياً؟")) return;
        const { error } = await db.from('employees').delete().eq('id', id);
        if (error) {
            alert("لا يمكن حذف الموظف لوجود شفتات مرتبطة بحسابه، يمكنك تعطيله بدلاً من ذلك.");
        } else {
            App.showToast("تم حذف الموظف بنجاح");
            await this.loadEmployees();
        }
    },

    openNewEmpModal() { 
        document.getElementById('edit-emp-id').value = '';
        document.getElementById('new-emp-form').reset();
        document.getElementById('emp-modal-title').textContent = 'إنشاء موظف جديد';
        document.getElementById('emp-modal').classList.remove('hidden'); 
    },

    openEditEmpModal(id, name, username, shiftType) {
        document.getElementById('edit-emp-id').value = id;
        document.getElementById('new-emp-name').value = name;
        document.getElementById('new-emp-username').value = username;
        document.getElementById('new-emp-shift-type').value = shiftType;
        document.getElementById('emp-modal-title').textContent = 'تعديل بيانات الموظف';
        document.getElementById('emp-modal').classList.remove('hidden');
    },

    closeEmpModal() { document.getElementById('emp-modal').classList.add('hidden'); },

    async saveEmployee(id, fullName, email, username, password, shiftType) {
        if (id) {
            const updateObj = { full_name: fullName, username, shift_type: shiftType };
            const { error } = await db.from('employees').update(updateObj).eq('id', id);
            if (error) throw error;
            App.showToast("تم تعديل بيانات الموظف");
        } else {
            const { data: authData, error: authErr } = await db.auth.signUp({ email, password });
            if (authErr) throw authErr;

            const { error: empErr } = await db.from('employees').insert({
                id: authData.user.id,
                username: username,
                full_name: fullName,
                role: 'employee',
                shift_type: shiftType,
                is_active: true
            });
            if (empErr) throw empErr;
            App.showToast("تم إضافة الموظف بنجاح");
        }
        this.closeEmpModal();
        await this.loadEmployees();
    },

    async loadShifts() {
        const { data } = await db.from('shifts').select('*, employees(full_name)').order('created_at', { ascending: false });
        this.allShifts = data || [];
        this.renderShifts(this.allShifts);
    },

    renderShifts(shifts) {
        const tbody = document.getElementById('shifts-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        shifts.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.employees?.full_name || 'غير معروف'}</td>
                <td><span class="badge">${s.shift_type || 'صباحي'}</span></td>
                <td>${new Date(s.start_time).toLocaleString('ar-IQ')}</td>
                <td>${s.end_time ? new Date(s.end_time).toLocaleString('ar-IQ') : '-'}</td>
                <td>$${parseFloat(s.initial_cash || 0).toFixed(2)}</td>
                <td>$${parseFloat((s.sold_transactions_total || 0) + (s.misc_sold_total || 0)).toFixed(2)}</td>
                <td>$${parseFloat(s.final_expected_total || 0).toFixed(2)}</td>
                <td>${s.status === 'open' ? 'مفتوح' : 'منتهي'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="Admin.printSingleShift('${s.id}')">🖨️ طباعة</button>
                    <button class="btn btn-sm btn-secondary" onclick="Admin.editShiftPrompt('${s.id}', ${s.initial_cash}, ${s.final_expected_total})">✏️ تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="Admin.deleteShift('${s.id}')">🗑️ حذف</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

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
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>تقرير شفت مفصل</h2>
                    <div class="row"><span>الموظف:</span> <strong>${s.employees?.full_name || '-'}</strong></div>
                    <div class="row"><span>نوع الشفت:</span> <strong>${s.shift_type || 'صباحي'}</strong></div>
                    <div class="row"><span>تاريخ البداية:</span> <strong>${new Date(s.start_time).toLocaleString('ar-IQ')}</strong></div>
                    <div class="row"><span>تاريخ النهاية:</span> <strong>${s.end_time ? new Date(s.end_time).toLocaleString('ar-IQ') : 'مفتوح'}</strong></div>
                    <hr>
                    <div class="row"><span>الإيراد الابتدائي:</span> <strong>$${parseFloat(s.initial_cash || 0).toFixed(2)}</strong></div>
                    <div class="row"><span>المبلغ المعزز:</span> <strong>$${parseFloat(s.box_replenishment || 0).toFixed(2)}</strong></div>
                    <div class="row"><span>إجمالي المبيعات:</span> <strong>$${sales.toFixed(2)}</strong></div>
                    <div class="row" style="font-weight:bold; font-size:1.1em;"><span>النقد المتوقع النهاية:</span> <strong>$${parseFloat(s.final_expected_total || 0).toFixed(2)}</strong></div>
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    async editShiftPrompt(shiftId, currentInitial, currentFinal) {
        const newInitial = prompt("تعديل المبلغ الابتدائي ($):", currentInitial);
        if (newInitial === null) return;

        const newFinal = prompt("تعديل النقد المتوقع النهائي ($):", currentFinal);
        if (newFinal === null) return;

        const { error } = await db.from('shifts').update({
            initial_cash: parseFloat(newInitial || 0),
            final_expected_total: parseFloat(newFinal || 0)
        }).eq('id', shiftId);

        if (error) {
            alert("حدث خطأ أثناء التعديل: " + error.message);
        } else {
            App.showToast("تم تعديل الشفت بنجاح");
            await this.loadShifts();
        }
    },

    async deleteShift(shiftId) {
        if (!confirm("هل أنت تأكد من حذف هذا الشفت نهائياً؟")) return;

        const { error } = await db.from('shifts').delete().eq('id', shiftId);

        if (error) {
            alert("حدث خطأ أثناء الحذف: " + error.message);
        } else {
            App.showToast("تم حذف الشفت بنجاح");
            await this.loadShifts();
        }
    },

    filterShifts() {
        const query = document.getElementById('shift-search-input').value.toLowerCase();
        const dateVal = document.getElementById('shift-date-input').value;

        const filtered = this.allShifts.filter(s => {
            const nameMatch = (s.employees?.full_name || '').toLowerCase().includes(query);
            const dateMatch = !dateVal || s.start_time.startsWith(dateVal);
            return nameMatch && dateMatch;
        });

        this.renderShifts(filtered);
    },

    async generateFilteredReport() {
        const empId = document.getElementById('report-emp-select').value;
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;

        let query = db.from('shifts').select('*, employees(full_name)').eq('status', 'completed');
        
        if (empId) query = query.eq('employee_id', empId);
        if (startDate) query = query.gte('start_time', startDate);
        if (endDate) query = query.lte('start_time', endDate + 'T23:59:59');

        const { data } = await query;
        
        const container = document.getElementById('report-summary-content');
        if (!data || data.length === 0) {
            container.innerHTML = '<p>لا توجد بيانات مطابقة للتقرير.</p>';
            return;
        }

        let html = `<table class="data-table"><thead><tr>
            <th>الموظف</th><th>نوع الشفت</th><th>تاريخ الشفت</th><th>الابتدائي</th><th>المبيعات</th><th>المبلغ الصافي المتوقع</th>
        </tr></thead><tbody>`;

        let totalRev = 0;
        data.forEach(s => {
            const sales = (s.sold_transactions_total || 0) + (s.misc_sold_total || 0);
            totalRev += parseFloat(s.final_expected_total || 0);
            html += `<tr>
                <td>${s.employees?.full_name || '-'}</td>
                <td>${s.shift_type || 'صباحي'}</td>
                <td>${new Date(s.start_time).toLocaleDateString('ar-IQ')}</td>
                <td>$${parseFloat(s.initial_cash || 0).toFixed(2)}</td>
                <td>$${sales.toFixed(2)}</td>
                <td>$${parseFloat(s.final_expected_total || 0).toFixed(2)}</td>
            </tr>`;
        });

        html += `</tbody></table><h4 style="margin-top:1rem;">إجمالي النقد المتبقي بالشفتات: $${totalRev.toFixed(2)}</h4>`;
        container.innerHTML = html;
    },

    async exportBackup() {
        const { data: shifts } = await db.from('shifts').select('*');
        const { data: employees } = await db.from('employees').select('*');
        const backupData = JSON.stringify({ shifts, employees, date: new Date() }, null, 2);
        
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    },

    async importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.employees && data.employees.length > 0) {
                    await db.from('employees').upsert(data.employees);
                }
                if (data.shifts && data.shifts.length > 0) {
                    await db.from('shifts').upsert(data.shifts);
                }
                App.showToast("تمت استعادة النسخة الاحتياطية بنجاح!");
                await this.init();
            } catch (err) {
                alert("حدث خطأ أثناء استعادة النسخة: " + err.message);
            }
        };
        reader.readAsText(file);
    }
};
                      
