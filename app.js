const App = {
    init() {
        Auth.init();
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const errBox = document.getElementById('login-error');
            errBox.classList.add('hidden');
            btn.disabled = true;

            try {
                const id = document.getElementById('login-identifier').value;
                const pass = document.getElementById('login-password').value;
                await Auth.login(id, pass);
            } catch (err) {
                errBox.textContent = err.message || "فشل تسجيل الدخول، تحقق من البيانات";
                errBox.classList.remove('hidden');
            } finally {
                btn.disabled = false;
            }
        });

        document.getElementById('start-shift-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const val = parseFloat(document.getElementById('initial-cash').value || 0);
            const shiftType = document.getElementById('cashier-shift-type').value;
            await Cashier.startShift(val, shiftType);
        });

        document.getElementById('end-shift-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await Cashier.closeShift();
        });

        document.getElementById('new-emp-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-emp-id').value;
            const name = document.getElementById('new-emp-name').value;
            const email = document.getElementById('new-emp-email').value || `${document.getElementById('new-emp-username').value}@system.local`;
            const username = document.getElementById('new-emp-username').value;
            const pass = document.getElementById('new-emp-password').value;
            const shiftType = document.getElementById('new-emp-shift-type').value;

            await Admin.saveEmployee(editId, name, email, username, pass, shiftType);
        });
    },

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
