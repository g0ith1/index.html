tbody.innerHTMLFixed(2)}</strong></div>
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
            await this.loadShifts();
            await this.loadMetrics();
        }
    }
};
