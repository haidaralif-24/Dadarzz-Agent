/**
 * Dadarzz Agent — Frontend JavaScript
 * Handles: chat, shortcuts, file upload, notifications, dark/light mode
 */

document.addEventListener("DOMContentLoaded", () => {
    // ── DOM References ─────────────────────────────────────
    const chatForm = document.getElementById("chat-form");
    const messageInput = document.getElementById("message-input");
    const chatBox = document.getElementById("chat-box");
    const sendButton = document.getElementById("send-button");
    const fileInput = document.getElementById("file-input");
    const filePreview = document.getElementById("file-preview");
    const fileName = document.getElementById("file-name");
    const fileRemove = document.getElementById("file-remove");
    const toastContainer = document.getElementById("toast-container");

    // Sidebar / mobile
    const menuBtn = document.getElementById("menu-btn");
    const sidebar = document.getElementById("sidebar");

    // Theme
    const themeToggle = document.getElementById("theme-toggle");
    const themeToggleSm = document.getElementById("theme-toggle-sm");
    const themeIcon = document.getElementById("theme-icon");

    // ══════════════════════════════════════════════════════
    // THEME — Dark / Light Mode
    // ══════════════════════════════════════════════════════

    function initTheme() {
        const saved = localStorage.getItem("theme");
        if (saved === "light") {
            document.body.classList.add("light");
        } else if (!saved && window.matchMedia("(prefers-color-scheme: light)").matches) {
            document.body.classList.add("light");
        }
        updateThemeIcon();
    }

    function toggleTheme() {
        document.body.classList.toggle("light");
        localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const isLight = document.body.classList.contains("light");
        const iconClass = isLight ? "icon-sun" : "icon-moon";
        if (themeIcon) themeIcon.className = `icon ${iconClass}`;
        if (themeToggleSm) themeToggleSm.innerHTML = `<span class="icon ${iconClass}"></span>`;
    }

    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
    if (themeToggleSm) themeToggleSm.addEventListener("click", toggleTheme);
    initTheme();


    // ══════════════════════════════════════════════════════
    // SIDEBAR — Mobile toggle
    // ══════════════════════════════════════════════════════

    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

        // Close on outside click
        document.addEventListener("click", (e) => {
            if (sidebar.classList.contains("open") &&
                !sidebar.contains(e.target) &&
                !menuBtn.contains(e.target)) {
                sidebar.classList.remove("open");
            }
        });
    }


    // ══════════════════════════════════════════════════════
    // CHAT — Send messages
    // ══════════════════════════════════════════════════════

    if (chatForm) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (!message) return;

            // Add user message to UI
            addMessage(message, "user");
            messageInput.value = "";
            sendButton.disabled = true;

            // Show typing indicator
            const typingEl = showTyping();

            try {
                const formData = new FormData();
                formData.append("message", message);

                // Attach file if present
                if (fileInput && fileInput.files.length > 0) {
                    formData.append("file", fileInput.files[0]);
                }

                const response = await fetch("/chat", {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json();
                removeTyping(typingEl);

                const reply = data.response || "No response received.";
                addMessage(reply, "assistant");

                // Clear file
                clearFile();

            } catch (error) {
                removeTyping(typingEl);
                addMessage("Error connecting to server. Please try again.", "assistant");
                console.error("Chat error:", error);
            } finally {
                sendButton.disabled = false;
                messageInput.focus();
            }
        });
    }


    // ══════════════════════════════════════════════════════
    // SHORTCUTS — Chip click handlers
    // ══════════════════════════════════════════════════════

    document.querySelectorAll(".chip[data-shortcut]").forEach(chip => {
        chip.addEventListener("click", () => {
            if (messageInput) {
                messageInput.value = chip.dataset.shortcut + " ";
                messageInput.focus();
            }
        });
    });


    // ══════════════════════════════════════════════════════
    // FILE UPLOAD
    // ══════════════════════════════════════════════════════

    if (fileInput) {
        fileInput.addEventListener("change", () => {
            if (fileInput.files.length > 0) {
                if (filePreview) filePreview.style.display = "flex";
                if (fileName) fileName.textContent = fileInput.files[0].name;
            }
        });
    }

    if (fileRemove) {
        fileRemove.addEventListener("click", clearFile);
    }

    function clearFile() {
        if (fileInput) fileInput.value = "";
        if (filePreview) filePreview.style.display = "none";
        if (fileName) fileName.textContent = "";
    }


    // ══════════════════════════════════════════════════════
    // NOTIFICATIONS — Poll /notify/check
    // ══════════════════════════════════════════════════════

    // Ask for notification permission
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Poll every 60 seconds
    setInterval(async () => {
        try {
            const resp = await fetch("/notify/check", { method: "POST" });
            const data = await resp.json();
            const notifications = data.notifications || [];

            for (const n of notifications) {
                showToast(n.title, "toast-warning");

                // Browser notification
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Dadarzz Agent", {
                        body: n.title,
                        icon: "/static/logo.svg",
                    });
                }
            }
        } catch {
            // Silently fail
        }
    }, 60000);


    // ══════════════════════════════════════════════════════
    // UI HELPERS
    // ══════════════════════════════════════════════════════

    function addMessage(content, role) {
        if (!chatBox) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${role}`;

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        if (role === "user") {
            avatar.innerHTML = '<span class="icon icon-user"></span>';
        } else {
            avatar.innerHTML = '<img src="/static/logo.svg" alt="DA" class="avatar-logo">';
        }

        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";

        // Parse content with basic line breaks
        const paragraphs = content.split("\n").filter(p => p.trim() !== "");
        if (paragraphs.length > 1) {
            paragraphs.forEach(p => {
                const pEl = document.createElement("p");
                pEl.textContent = p;
                contentDiv.appendChild(pEl);
            });
        } else {
            const pEl = document.createElement("p");
            pEl.textContent = content;
            contentDiv.appendChild(pEl);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(contentDiv);
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showTyping() {
        if (!chatBox) return null;
        const div = document.createElement("div");
        div.className = "message assistant";
        div.innerHTML = `
            <div class="message-avatar"><img src="/static/logo.svg" alt="DA" class="avatar-logo"></div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
        return div;
    }

    function removeTyping(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function showToast(message, type = "") {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = "toastOut 0.3s forwards";
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    window.showToast = showToast;
});
