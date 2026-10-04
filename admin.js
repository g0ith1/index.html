const Admin = {
    async init() {
        await this.loadMetrics();
        await this.loadEmployees();
        await this.loadShifts();
    },

    showTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
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
        tbody.innerHTML = '';
        
        data?.forEach(emp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${emp.full_name}</td>
                <td>${emp.username}</td>
                <td><span class="badge">${emp.is_active ? 'نشط' : 'معطل'}</span></td>
                <td>${emp.role}</td>
                <td>${new Date(emp.created_at).toLocaleDateString('ar-IQ')}</td>
                <td>
                    <button class="btn btn-sm ${emp.is_active ? 'btn-danger' : 'btn-success'}" 
                        onclick="Admin.toggleEmpStatus('${emp.id}', ${!emp.is_active})">
                        ${emp.is_active ? 'تعطيل' : 'تفعيل'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    async toggleEmpStatus(id, newStatus) {
        await db.from('employees').update({ is_active: newStatus }).eq('id', id);
        App.showToast("تم تحديث حالة الموظف");
        await this.loadEmployees();
    },

    openNewEmpModal() { document.getElementById('emp-modal').classList.remove('hidden'); },
    closeEmpModal() { document.getElementById('emp-modal').classList.add('hidden'); },

    async createEmployee(fullName, email, username, password) {
        const { data: authData, error: authErr } = await db.auth.signUp({ email, password });
        if (authErr) throw authErr;

        const { error: empErr } = await db.from('employees').insert({
            id: authData.user.id,
            username: username,
            full_name: fullName,
            role: 'employee',
            is_active: true
        });

        if (empErr) throw empErr;

        App.showToast("تم إضافة الموظف بنجاح");
        this.closeEmpModal();
        await this.loadEmployees();
    },

    async loadShifts() {
        const { data } = await db.from('shifts').select('*, employees(full_name)').order('created_at', { ascending: false });
        const tbody = document.getElementById('shifts-table-body');
        tbody.innerHTML = '';

        data?.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.employees?.full_name || 'غير معروف'}</td>
                <td>${new Date(s.start_time).toLocaleString('ar-IQ')}</td>
                <td>${s.end_time ? new Date(s.end_time).toLocaleString('ar-IQ') : '-'}</td>
                <td>$${parseFloat(s.initial_cash).toFixed(2)}</td>
                <td>$${parseFloat(s.sold_transactions_total + s.misc_sold_total).toFixed(2)}</td>
                <td>$${parseFloat(s.final_expected_total).toFixed(2)}</td>
                <td>${s.status === 'open' ? 'مفتوح' : 'منتهي'}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    async exportBackup() {
        const { data: shifts } = await db.from('shifts').select('*');
        const { data: employees } = await db.from('employees').select('*');
        const backupData = JSON.stringify({ shifts, employees, date: new Date() });
        
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    }
};

