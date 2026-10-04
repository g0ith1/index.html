const Auth = {
    currentUser: null,
    userProfile: null,

    async init() {
        const { data: { session } } = await db.auth.getSession();
        if (session) {
            await this.handleSession(session);
        } else {
            this.showView('login-section');
        }

        db.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await this.handleSession(session);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userProfile = null;
                this.showView('login-section');
            }
        });
    },

    async login(identifier, password) {
        let email = identifier;
        if (!identifier.includes('@')) {
            const { data } = await db.from('employees').select('id').eq('username', identifier).single();
            if (data) {
                email = `${identifier}@system.local`;
            }
        }

        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async handleSession(session) {
        this.currentUser = session.user;
        const { data: profile, error } = await db.from('employees').select('*').eq('id', session.user.id).single();
        
        if (error || !profile || !profile.is_active) {
            alert("الحساب غير مفعّل أو حُذف من قبل المدير");
            await this.logout();
            return;
        }

        this.userProfile = profile;
        if (profile.role === 'admin') {
            this.showView('admin-section');
            Admin.init();
        } else {
            this.showView('cashier-section');
            Cashier.init();
        }
    },

    async logout() {
        await db.auth.signOut();
    },

    showView(viewId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
    }
};

