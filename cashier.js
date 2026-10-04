const Cashier = {
    currentShift: null,

    async init() {
        document.getElementById('cashier-name').textContent = Auth.userProfile.full_name;
        await this.checkActiveShift();
        this.bindEvents();
    },

    async checkActiveShift() {
        const { data } = await db.from('shifts')
            .select('*')
            .eq('employee_id', Auth.currentUser.id)
            .eq('status', 'open')
            .maybeSingle();

        if (data) {
            this.currentShift = data;
            document.getElementById('start-shift-card').classList.add('hidden');
            document.getElementById('end-shift-card').classList.remove('hidden');
            document.getElementById('cashier-status-badge').textContent = "شفت مفتوح";
            document.getElementById('cashier-status-badge').style.background = "var(--success)";
        } else {
            this.currentShift = null;
            document.getElementById('start-shift-card').classList.remove('hidden');
            document.getElementById('end-shift-card').classList.add('hidden');
            document.getElementById('cashier-status-badge').textContent = "شفت مغلق";
            document.getElementById('cashier-status-badge').style.background = "var(--text-muted)";
        }
    },

    bindEvents() {
        ['sold-count', 'unsold-count', 'box-replenishment'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.calculateTotals());
        });
    },

    calculateTotals() {
        const initial = parseFloat(this.currentShift?.initial_cash || 0);
        const replenishment = parseFloat(document.getElementById('box-replenishment').value || 0);
        
        const soldCount = parseInt(document.getElementById('sold-count').value || 0);
        const soldCountTotal = soldCount * 2000;
        document.getElementById('sold-count-total').textContent = soldCountTotal.toFixed(2);

        let miscSoldTotal = 0;
        document.querySelectorAll('.m-sold-price').forEach(i => miscSoldTotal += parseFloat(i.value || 0));
        document.getElementById('misc-sold-total').textContent = miscSoldTotal.toFixed(2);

        const unsoldC = parseInt(document.getElementById('unsold-count').value || 0);
        document.getElementById('unsold-count-total').textContent = (unsoldC * 2000).toFixed(2);

        let miscUnsoldTotal = 0;
        document.querySelectorAll('.m-unsold-price').forEach(i => miscUnsoldTotal += parseFloat(i.value || 0));
        document.getElementById('misc-unsold-total').textContent = miscUnsoldTotal.toFixed(2);

        const baseTotal = initial + replenishment;
        const totalSales = soldCountTotal + miscSoldTotal;
        const finalExpected = baseTotal - totalSales;

        document.getElementById('sum-base').textContent = baseTotal.toFixed(2);
        document.getElementById('sum-sales').textContent = totalSales.toFixed(2);
        document.getElementById('sum-final').textContent = finalExpected.toFixed(2);
    },

    async closeShift() {
        if (!confirm("هل أنت متأكد من إنهاء الشفت؟")) return;

        const shiftId = this.currentShift.id;
        const soldCount = parseInt(document.getElementById('sold-count').value || 0);
        const soldTotal = soldCount * 2000;
        
        let miscSoldTotal = 0;
        document.querySelectorAll('.m-sold-price').forEach(i => miscSoldTotal += parseFloat(i.value || 0));

        const unsoldC = parseInt(document.getElementById('unsold-count').value || 0);
        let miscUnsoldTotal = 0;
        document.querySelectorAll('.m-unsold-price').forEach(i => miscUnsoldTotal += parseFloat(i.value || 0));

        const replenishment = parseFloat(document.getElementById('box-replenishment').value || 0);
        const base = parseFloat(this.currentShift.initial_cash) + replenishment;
        const totalSales = soldTotal + miscSoldTotal;
        const finalTotal = base - totalSales;

        const shiftSummary = {
            cashier: Auth.userProfile.full_name,
            shiftType: this.currentShift.shift_type || 'صباحي',
            initial: this.currentShift.initial_cash,
            replenishment: replenishment,
            sales: totalSales,
            final: finalTotal,
            date: new Date().toLocaleString('ar-IQ')
        };

        const { error } = await db.from('shifts').update({
            status: 'completed',
            end_time: new Date().toISOString(),
            box_replenishment: replenishment,
            sold_transactions_count: soldCount,
            sold_transactions_total: soldTotal,
            misc_sold_total: miscSoldTotal,
            unsold_transactions_count: unsoldC,
            unsold_transactions_total: unsoldC * 2000,
            misc_unsold_total: miscUnsoldTotal,
            final_expected_total: finalTotal,
            notes: document.getElementById('shift-notes')?.value || ''
        }).eq('id', shiftId);

        if (error) {
            alert("حدث خطأ أثناء حفظ الشفت: " + error.message);
            throw error;
        }

        App.showToast("تم إغلاق الشفت وحفظ البيانات بنجاح");
        
        // فتح نافذة الطباعة مباشرة
        this.printShiftReceipt(shiftSummary);

        await this.checkActiveShift();
    },

    printShiftReceipt(summary) {
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        printWindow.document.write(`
            <html dir="rtl">
            <head>
                <title>تقرير إغلاق الشفت</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; text-align: center; }
                    .card { border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
                    .row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px dashed #eee; padding-bottom: 4px; }
                    .total { font-weight: bold; font-size: 1.2em; color: #000; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>إيصال إغلاق الشفت</h2>
                    <div class="row"><span>الموظف:</span> <strong>${summary.cashier}</strong></div>
                    <div class="row"><span>نوع الشفت:</span> <strong>${summary.shiftType}</strong></div>
                    <div class="row"><span>التاريخ:</span> <strong>${summary.date}</strong></div>
                    <hr>
                    <div class="row"><span>المبلغ الابتدائي:</span> <strong>$${parseFloat(summary.initial).toFixed(2)}</strong></div>
                    <div class="row"><span>المبلغ المعزز:</span> <strong>$${parseFloat(summary.replenishment).toFixed(2)}</strong></div>
                    <div class="row"><span>إجمالي المبيعات:</span> <strong>$${parseFloat(summary.sales).toFixed(2)}</strong></div>
                    <div class="row total"><span>النقد المتوقع النهائي:</span> <strong>$${parseFloat(summary.final).toFixed(2)}</strong></div>
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};
