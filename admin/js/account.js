/* =====================================================
   ATHR STORE — تغيير كلمة مرور لوحة التحكم
===================================================== */

(function () {
    const modal = $("passwordModal");
    const form = $("passwordForm");
    const message = $("passwordMessage");
    const saveBtn = $("savePasswordBtn");

    if (!modal || !form) return;

    function setMessage(text, type = "error") {
        message.textContent = text;
        message.className = `form-message${type ? " " + type : ""}`;
    }

    function openModal() {
        form.reset();
        setMessage("", "");
        modal.classList.remove("hidden");
        setTimeout(() => $("newPassword")?.focus(), 50);
    }

    function closeModal() {
        modal.classList.add("hidden");
    }

    $("passwordBtn")?.addEventListener("click", openModal);
    modal.querySelectorAll("[data-close-password]").forEach(el => el.addEventListener("click", closeModal));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = $("newPassword").value;
        const confirmation = $("confirmPassword").value;

        if (password.length < 8) {
            setMessage("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
            return;
        }

        if (password !== confirmation) {
            setMessage("كلمتا المرور غير متطابقتين.");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "جاري الحفظ...";
        setMessage("", "");

        const { error } = await athrSupabase.auth.updateUser({ password });

        saveBtn.disabled = false;
        saveBtn.textContent = "حفظ كلمة المرور";

        if (error) {
            console.error("Password update error:", error);
            const text = String(error.message || "");
            if (text.includes("different")) {
                setMessage("اختر كلمة مرور مختلفة عن الحالية.");
            } else if (text.toLowerCase().includes("weak") || text.includes("characters")) {
                setMessage("كلمة المرور ضعيفة. أضف أرقامًا وحروفًا أكثر.");
            } else {
                setMessage("تعذر تغيير كلمة المرور. سجّل الخروج وادخل مرة أخرى ثم حاول.");
            }
            return;
        }

        setMessage("تم تغيير كلمة المرور ✅", "success");
        showToast("تم تغيير كلمة المرور");
        setTimeout(closeModal, 1200);
    });
})();
