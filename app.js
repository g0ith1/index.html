// ==========================================
// نظام مطابقة الصناديق
// app.js
// ==========================================

let currentUser = null;
let currentRole = null;
let reportStartTime = null;


// ==========================================
// أدوات عامة
// ==========================================

function $(id) {
    return document.getElementById(id);
}

function getNow() {
    return new Date();
}

function toDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}


// ==========================================
// تسجيل الدخول
// ==========================================

function login() {

    const username = $("username").value.trim();
    const password = $("password").value.trim();

    if (!username || !password) {
        showLoginError("يرجى إدخال اسم المستخدم وكلمة المرور");
        return;
    }

    /*
     * مؤقتًا:
     * سيتم استبدال هذا الدخول بربط Supabase.
     *
     * لا تعتمد على كلمات المرور الموجودة هنا
     * عند تشغيل النظام رسميًا.
     */

    currentUser = username;

    if (username.toLowerCase() === "admin") {
        currentRole = "manager";
    } else {
        currentRole = "employee";
    }

    $("loginScreen").style.display = "none";
    $("mainApp").style.display = "block";

    $("currentUser").textContent = username;

    if (currentRole === "employee") {
        $("employeeName").value = username;
    }

    startReportTimer();

    applyRolePermissions();
}


function showLoginError(message) {

    const error = $("loginError");

    error.textContent = message;
    error.style.display = "block";
}


function logout() {

    currentUser = null;
    currentRole = null;

    $("mainApp").style.display = "none";
    $("loginScreen").style.display = "flex";

    $("username").value = "";
    $("password").value = "";

    const error = $("loginError");

    if (error) {
        error.style.display = "none";
    }
}


// ==========================================
// صلاحيات المستخدم
// ==========================================

function applyRolePermissions() {

    /*
     * واجهة الموظف الحالية.
     *
     * لوحة المدير الكاملة سنضيفها بعد ربط Supabase.
     */

    if (currentRole === "manager") {
        console.log("تم الدخول كمدير");
    }

    if (currentRole === "employee") {
        console.log("تم الدخول كموظف");
    }
}


// ==========================================
// وقت بداية الشفت
// ==========================================

function startReportTimer() {

    reportStartTime = getNow();

    if ($("startTime")) {
        $("startTime").value =
            toDateTimeLocal(reportStartTime);
    }

    if ($("endTime")) {
        $("endTime").value = "";
    }
}


// ==========================================
// وقت نهاية الشفت
// ==========================================

function finishReportTimer() {

    const endTime = getNow();

    if ($("endTime")) {
        $("endTime").value =
            toDateTimeLocal(endTime);
    }

    return endTime;
}


// ==========================================
// المعاملات غير المباعة
// ==========================================

function generateUnsoldTransactions() {

    const count =
        parseInt($("unsoldCount").value) || 0;

    const container = $("unsoldList");

    container.innerHTML = "";

    if (count <= 0) {
        return;
    }

    for (let i = 1; i <= count; i++) {

        const card =
            document.createElement("div");

        card.className = "transaction-card";

        card.innerHTML = `

            <div class="transaction-header">
                المعاملة غير المباعة رقم ${i}
            </div>

            <div class="form-group">

                <label>
                    اسم الزبون - اختياري
                </label>

                <input
                    type="text"
                    class="unsold-name"
                    data-index="${i}"
                    placeholder="اسم الزبون"
                >

            </div>

            <div class="file-box">

                <label>
                    إرفاق سكان / ملف
                </label>

                <input
                    type="file"
                    class="unsold-file"
                    data-index="${i}"
                    accept="image/*,.pdf"
                >

            </div>
        `;

        container.appendChild(card);
    }
}


// ==========================================
// المعاملات المتفرقة
// ==========================================

function addMiscTransaction() {

    const container = $("miscList");

    const card =
        document.createElement("div");

    card.className = "transaction-card";

    card.innerHTML = `

        <div class="transaction-header">
            معاملة متفرقة
        </div>

        <div class="form-group">

            <label>
                تفاصيل المعاملة
            </label>

            <textarea
                class="misc-details"
                placeholder="اكتب تفاصيل المعاملة"
            ></textarea>

        </div>

        <div class="misc-row">

            <div>

                <label>
                    السكان / الملف
                </label>

                <input
                    type="file"
                    class="misc-file"
                    accept="image/*,.pdf"
                >

            </div>

            <div>

                <label>
                    السعر
                </label>

                <input
                    type="number"
                    class="misc-price"
                    min="0"
                    placeholder="0"
                >

            </div>

        </div>

        <button
            type="button"
            class="btn-danger"
            onclick="removeMiscTransaction(this)"
        >
            حذف
        </button>
    `;

    container.appendChild(card);
}


function removeMiscTransaction(button) {

    const card =
        button.closest(".transaction-card");

    if (card) {
        card.remove();
    }
}


// ==========================================
// جمع المعاملات غير المباعة
// ==========================================

function collectUnsoldTransactions() {

    const names =
        document.querySelectorAll(".unsold-name");

    const files =
        document.querySelectorAll(".unsold-file");

    const transactions = [];

    for (let i = 0; i < names.length; i++) {

        transactions.push({
            number: i + 1,
            customer_name: names[i].value.trim() || null,
            file_name:
                files[i] && files[i].files.length
                    ? files[i].files[0].name
                    : null
        });
    }

    return transactions;
}


// ==========================================
// جمع المعاملات المتفرقة
// ==========================================

function collectMiscTransactions() {

    const details =
        document.querySelectorAll(".misc-details");

    const prices =
        document.querySelectorAll(".misc-price");

    const files =
        document.querySelectorAll(".misc-file");

    const transactions = [];

    for (let i = 0; i < details.length; i++) {

        transactions.push({

            number: i + 1,

            details:
                details[i].value.trim(),

            price:
                Number(prices[i].value) || 0,

            file_name:
                files[i] && files[i].files.length
                    ? files[i].files[0].name
                    : null
        });
    }

    return transactions;
}


// ==========================================
// تجهيز التقرير
// ==========================================

function collectReportData() {

    finishReportTimer();

    const report = {

        employee_name:
            $("employeeName").value.trim(),

        cash_amount:
            Number($("cashAmount").value) || 0,

        reinforcement:
            Number($("reinforcement").value) || 0,

        sold_count:
            Number($("soldCount").value) || 0,

        sold_amount:
            Number($("soldAmount").value) || 0,

        unsold_count:
            Number($("unsoldCount").value) || 0,

        unsold_amount:
            Number($("unsoldAmount").value) || 0,

        handed_to:
            $("handedTo").value.trim(),

        start_time:
            $("startTime").value,

        end_time:
            $("endTime").value,

        unsold_transactions:
            collectUnsoldTransactions(),

        miscellaneous_transactions:
            collectMiscTransactions(),

        created_by:
            currentUser,

        created_role:
            currentRole
    };

    return report;
}


// ==========================================
// حفظ التقرير
// ==========================================

async function saveReport() {

    try {

        const report =
            collectReportData();

        if (!report.employee_name) {
            alert("يرجى إدخال اسم الموظف");
            return;
        }

        const status =
            $("saveStatus");

        status.textContent =
            "تم تجهيز التقرير بنجاح. الحفظ النهائي سيتم عبر Supabase.";

        status.classList.remove("hidden");

        console.log(
            "REPORT:",
            report
        );

        /*
         * هنا سنضع كود Supabase الحقيقي
         * بعد إنشاء قاعدة البيانات.
         */

    } catch (error) {

        console.error(error);

        alert(
            "حدث خطأ أثناء تجهيز التقرير"
        );
    }
}


// ==========================================
// تفريغ النموذج
// ==========================================

function clearForm() {

    const confirmed =
        confirm(
            "هل تريد تفريغ جميع البيانات؟"
        );

    if (!confirmed) {
        return;
    }

    $("employeeName").value =
        currentRole === "employee"
            ? currentUser
            : "";

    $("cashAmount").value = "";

    $("reinforcement").value = "";

    $("soldCount").value = "0";

    $("soldAmount").value = "";

    $("unsoldCount").value = "0";

    $("unsoldAmount").value = "";

    $("handedTo").value = "";

    $("unsoldList").innerHTML = "";

    $("miscList").innerHTML = "";

    $("saveStatus").classList.add("hidden");

    startReportTimer();
}


// ==========================================
// منع إرسال الصفحة بالخطأ
// ==========================================

document.addEventListener(
    "submit",
    function(event) {
        event.preventDefault();
    }
);


// ==========================================
// تشغيل أولي
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "نظام مطابقة الصناديق جاهز"
        );

    }
);
